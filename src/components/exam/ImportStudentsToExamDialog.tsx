import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ImportResult {
  email: string;
  status: 'success' | 'error' | 'exists';
  message: string;
}

interface ImportStudentsToExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  onSuccess?: () => void;
}

export const ImportStudentsToExamDialog = ({
  open,
  onOpenChange,
  examId,
  examTitle,
  onSuccess,
}: ImportStudentsToExamDialogProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<'upload' | 'results'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Vui lòng chọn file CSV');
        return;
      }
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): string[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const emails: string[] = [];
    
    lines.forEach((line, index) => {
      // Skip header row if it looks like one
      if (index === 0 && (line.toLowerCase().includes('email') || !line.includes('@'))) {
        return;
      }
      
      // Get first column (email)
      const columns = line.split(',');
      const email = columns[0]?.trim().toLowerCase();
      
      if (email && email.includes('@')) {
        emails.push(email);
      }
    });

    return [...new Set(emails)]; // Remove duplicates
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file CSV');
      return;
    }

    setIsImporting(true);
    setResults([]);

    try {
      const text = await file.text();
      const emails = parseCSV(text);

      if (emails.length === 0) {
        toast.error('Không tìm thấy email hợp lệ trong file');
        setIsImporting(false);
        return;
      }

      // Fetch existing assignments
      const { data: existingAssignments, error: assignError } = await supabase
        .from('exam_assignments')
        .select('user_id')
        .eq('exam_id', examId);

      if (assignError) throw assignError;

      const existingUserIds = new Set((existingAssignments || []).map(a => a.user_id));

      // Fetch profiles by email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', emails);

      if (profilesError) throw profilesError;

      const emailToProfile = new Map((profiles || []).map(p => [p.email?.toLowerCase(), p]));

      const importResults: ImportResult[] = [];
      const toAssign: { exam_id: string; user_id: string; assigned_by: string }[] = [];

      for (const email of emails) {
        const profile = emailToProfile.get(email);
        
        if (!profile) {
          importResults.push({
            email,
            status: 'error',
            message: 'Email không tồn tại trong hệ thống',
          });
        } else if (existingUserIds.has(profile.id)) {
          importResults.push({
            email,
            status: 'exists',
            message: 'Đã được gán trước đó',
          });
        } else {
          toAssign.push({
            exam_id: examId,
            user_id: profile.id,
            assigned_by: user?.id || '',
          });
          importResults.push({
            email,
            status: 'success',
            message: 'Gán thành công',
          });
        }
      }

      // Batch insert new assignments
      if (toAssign.length > 0) {
        const { error: insertError } = await supabase
          .from('exam_assignments')
          .insert(toAssign);

        if (insertError) throw insertError;
      }

      setResults(importResults);
      setStep('results');

      const successCount = importResults.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        toast.success(`Đã gán ${successCount} thí sinh thành công`);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error importing students:', error);
      toast.error('Lỗi khi import thí sinh');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults([]);
    setStep('upload');
    onOpenChange(false);
  };

  const getStatusIcon = (status: ImportResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'exists':
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import thí sinh từ CSV
          </DialogTitle>
          <DialogDescription>
            Import danh sách email thí sinh cho bài thi "{examTitle}"
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File CSV</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Click để chọn file hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chỉ hỗ trợ file .csv
                    </p>
                  </>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium text-foreground mb-2">Định dạng file CSV:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Mỗi dòng chứa một email</li>
                <li>• Cột đầu tiên là email</li>
                <li>• Có thể bỏ qua dòng header</li>
              </ul>
              <div className="mt-2 p-2 bg-background rounded border text-xs font-mono">
                email<br />
                student1@example.com<br />
                student2@example.com
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-success" />
                Thành công: {results.filter(r => r.status === 'success').length}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-warning" />
                Đã tồn tại: {results.filter(r => r.status === 'exists').length}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-destructive" />
                Lỗi: {results.filter(r => r.status === 'error').length}
              </span>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'results' ? 'Đóng' : 'Hủy'}
          </Button>
          {step === 'upload' && (
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang import...
                </>
              ) : (
                'Import'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
