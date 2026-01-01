import { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBulkEnrollStudents } from '@/hooks/useClasses';
import { toast } from 'sonner';

interface ImportResult {
  email: string;
  status: 'success' | 'not_found' | 'duplicate' | 'error';
  message: string;
  studentId?: string;
}

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  className: string;
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  classId,
  className,
}: ImportStudentsDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const bulkEnroll = useBulkEnrollStudents();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

      // Find email column (look for header or first column with @ symbol)
      let emailColumnIndex = -1;
      const headerRow = rows[0] as unknown[];
      
      // Check header for email-related keywords
      if (headerRow) {
        emailColumnIndex = headerRow.findIndex(cell => 
          typeof cell === 'string' && 
          (cell.toLowerCase().includes('email') || 
           cell.toLowerCase().includes('e-mail') ||
           cell.toLowerCase().includes('mail'))
        );
      }

      // If no header found, look for column with @ symbols
      if (emailColumnIndex === -1) {
        for (let i = 0; i < (headerRow?.length || 0); i++) {
          const hasEmails = rows.slice(1).some(row => {
            const cell = (row as unknown[])[i];
            return typeof cell === 'string' && cell.includes('@');
          });
          if (hasEmails) {
            emailColumnIndex = i;
            break;
          }
        }
      }

      if (emailColumnIndex === -1) {
        toast.error('Không tìm thấy cột email trong file');
        return;
      }

      // Extract emails (skip header if exists)
      const headerCell = headerRow?.[emailColumnIndex];
      const startRow = headerRow && typeof headerCell === 'string' && 
        !headerCell.includes('@') ? 1 : 0;
      
      const extractedEmails: string[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const cell = (rows[i] as unknown[])[emailColumnIndex];
        if (typeof cell === 'string' && cell.includes('@')) {
          const email = cell.trim().toLowerCase();
          if (!extractedEmails.includes(email)) {
            extractedEmails.push(email);
          }
        }
      }

      if (extractedEmails.length === 0) {
        toast.error('Không tìm thấy email hợp lệ trong file');
        return;
      }

      setEmails(extractedEmails);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Không thể đọc file. Vui lòng kiểm tra lại định dạng');
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);
    const importResults: ImportResult[] = [];

    // Get existing enrollments
    const { data: existingEnrollments } = await supabase
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);

    const existingStudentIds = new Set(existingEnrollments?.map(e => e.student_id) || []);

    // Find profiles by email
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', emails);

    if (profilesError) {
      toast.error('Lỗi khi tìm kiếm học sinh');
      setStep('upload');
      return;
    }

    const emailToProfileMap = new Map(profiles?.map(p => [p.email?.toLowerCase(), p]) || []);

    // Process each email
    const studentsToEnroll: string[] = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      setProgress(Math.round(((i + 1) / emails.length) * 50));

      const profile = emailToProfileMap.get(email);

      if (!profile) {
        importResults.push({
          email,
          status: 'not_found',
          message: 'Không tìm thấy tài khoản với email này',
        });
      } else if (existingStudentIds.has(profile.id)) {
        importResults.push({
          email,
          status: 'duplicate',
          message: 'Học sinh đã có trong lớp',
          studentId: profile.id,
        });
      } else {
        studentsToEnroll.push(profile.id);
        importResults.push({
          email,
          status: 'success',
          message: 'Sẵn sàng thêm vào lớp',
          studentId: profile.id,
        });
      }
    }

    // Bulk enroll students
    if (studentsToEnroll.length > 0) {
      setProgress(75);
      try {
        await bulkEnroll.mutateAsync({
          class_id: classId,
          student_ids: studentsToEnroll,
        });
        
        // Update results status
        importResults.forEach(r => {
          if (r.status === 'success') {
            r.message = 'Đã thêm vào lớp thành công';
          }
        });
      } catch (error) {
        console.error('Error enrolling students:', error);
        importResults.forEach(r => {
          if (r.status === 'success') {
            r.status = 'error';
            r.message = 'Lỗi khi thêm vào lớp';
          }
        });
      }
    }

    setProgress(100);
    setResults(importResults);
    setStep('results');
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setEmails([]);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = 'Email\nstudent1@example.com\nstudent2@example.com';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status !== 'success').length;

  const getStatusIcon = (status: ImportResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'not_found':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ImportResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600">Thành công</Badge>;
      case 'duplicate':
        return <Badge className="bg-yellow-500/10 text-yellow-600">Đã tồn tại</Badge>;
      case 'not_found':
        return <Badge className="bg-red-500/10 text-red-600">Không tìm thấy</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import học sinh từ Excel
          </DialogTitle>
          <DialogDescription>
            Import danh sách học sinh vào lớp {className} từ file Excel hoặc CSV
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">Chọn file để upload</p>
              <p className="text-sm text-muted-foreground">
                Hỗ trợ file .xlsx, .xls, .csv
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                File cần có cột chứa email của học sinh. Học sinh cần có tài khoản trong hệ thống trước khi import.
              </AlertDescription>
            </Alert>

            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Tải file mẫu
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="font-medium">{file?.name}</span>
              </div>
              <Badge>{emails.length} email</Badge>
            </div>

            <Label>Danh sách email sẽ được import:</Label>
            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-1">
                {emails.map((email, index) => (
                  <div key={index} className="text-sm py-1 border-b last:border-0">
                    {email}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button onClick={handleImport}>
                Import {emails.length} email
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Đang import học sinh...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% hoàn thành
            </p>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
                <p className="text-sm text-muted-foreground">Thành công</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-sm text-muted-foreground">Không thành công</p>
              </div>
            </div>

            <Label>Chi tiết kết quả:</Label>
            <ScrollArea className="h-48 border rounded-lg">
              <div className="divide-y">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="text-sm truncate max-w-[200px]">{result.email}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button onClick={handleClose}>Đóng</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
