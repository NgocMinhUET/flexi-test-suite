import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/hooks/useAuth';

interface ImportResult {
  email: string;
  status: 'success' | 'error';
  message: string;
}

interface ImportUsersDialogProps {
  onUsersImported: () => void;
}

export function ImportUsersDialog({ onUsersImported }: ImportUsersDialogProps) {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = `email,password,full_name,role
user1@example.com,password123,Nguyen Van A,student
user2@example.com,password123,Tran Thi B,teacher
user3@example.com,password123,Le Van C,student`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mau_import_users.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string): Array<{
    email: string;
    password: string;
    full_name: string;
    role: AppRole;
  }> => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const emailIndex = headers.indexOf('email');
    const passwordIndex = headers.indexOf('password');
    const nameIndex = headers.indexOf('full_name');
    const roleIndex = headers.indexOf('role');

    if (emailIndex === -1 || passwordIndex === -1) {
      throw new Error('File CSV phải có cột email và password');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const role = values[roleIndex]?.toLowerCase() as AppRole;
      
      return {
        email: values[emailIndex] || '',
        password: values[passwordIndex] || '',
        full_name: values[nameIndex] || '',
        role: ['admin', 'teacher', 'student'].includes(role) ? role : 'student',
      };
    }).filter(u => u.email && u.password);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Vui lòng chọn file CSV');
        return;
      }
      setSelectedFile(file);
      setResults([]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file CSV');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResults([]);

    try {
      const text = await selectedFile.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        toast.error('Không tìm thấy dữ liệu hợp lệ trong file');
        setIsImporting(false);
        return;
      }

      const importResults: ImportResult[] = [];
      
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Phiên đăng nhập đã hết hạn');
        setIsImporting(false);
        return;
      }

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        setProgress(Math.round(((i + 1) / users.length) * 100));

        try {
          // Call edge function to create user (bypasses rate limits)
          const { data, error } = await supabase.functions.invoke('admin-create-user', {
            body: {
              email: user.email,
              password: user.password,
              full_name: user.full_name,
              role: user.role,
            },
          });

          if (error) throw error;
          if (data?.error) throw new Error(data.error);

          importResults.push({
            email: user.email,
            status: 'success',
            message: data?.warning || 'Tạo thành công',
          });
        } catch (error: any) {
          const errorMessage = error.message || 'Lỗi không xác định';
          importResults.push({
            email: user.email,
            status: 'error',
            message: errorMessage.includes('already been registered') 
              ? 'Email đã tồn tại' 
              : errorMessage.includes('rate limit')
              ? 'Quá giới hạn request'
              : errorMessage,
          });
        }

        // Small delay to avoid overwhelming the edge function
        if (i < users.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setResults(importResults);
      
      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;
      
      if (successCount > 0) {
        toast.success(`Đã tạo ${successCount} tài khoản thành công`);
        onUsersImported();
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} tài khoản không thể tạo`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Lỗi khi import: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import người dùng từ CSV</DialogTitle>
          <DialogDescription>
            Tải lên file CSV để tạo nhiều tài khoản cùng lúc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Tải file mẫu CSV</span>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Tải xuống
            </Button>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                {selectedFile ? (
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Nhấn để chọn file</span> hoặc kéo thả
                    </p>
                    <p className="text-xs text-muted-foreground">CSV (*.csv)</p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Đang import...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Kết quả import:</h4>
              <ScrollArea className="h-40 rounded-md border p-2">
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        result.status === 'success' 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {result.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="font-medium">{result.email}</span>
                      <span className="text-muted-foreground">- {result.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || isImporting}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
