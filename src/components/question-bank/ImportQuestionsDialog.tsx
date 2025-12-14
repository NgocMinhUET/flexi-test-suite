import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { parseExcelFile, ParsedQuestion, ValidationError } from '@/utils/questionExcelParser';
import { useImportQuestions } from '@/hooks/useImportQuestions';

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
  level: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  cognitive_levels: string[];
  taxonomy_config: { levels: string[] };
}

interface ImportQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject;
  taxonomyNodes: TaxonomyNode[];
}

type Step = 'upload' | 'preview' | 'importing' | 'result';

const questionTypeLabels: Record<string, string> = {
  MCQ_SINGLE: 'Trắc nghiệm',
  TRUE_FALSE_4: 'Đúng/Sai',
  SHORT_ANSWER: 'Trả lời ngắn',
  CODING: 'Lập trình',
};

export function ImportQuestionsDialog({
  open,
  onOpenChange,
  subject,
  taxonomyNodes,
}: ImportQuestionsDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: { code: string; message: string }[];
  } | null>(null);

  const importQuestions = useImportQuestions();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);

      try {
        const buffer = await selectedFile.arrayBuffer();
        const result = parseExcelFile(
          buffer,
          taxonomyNodes,
          subject.cognitive_levels
        );

        setParsedQuestions(result.questions);
        setValidationErrors(result.errors);
        setStep('preview');
      } catch (error) {
        console.error('Error parsing Excel:', error);
        setValidationErrors([
          { row: 0, field: 'file', message: 'Không thể đọc file Excel' },
        ]);
      }
    },
    [taxonomyNodes, subject.cognitive_levels]
  );

  const handleImport = async () => {
    if (parsedQuestions.length === 0) return;

    setStep('importing');
    setImportProgress(0);

    try {
      const result = await importQuestions.mutateAsync({
        questions: parsedQuestions,
        subjectId: subject.id,
        taxonomyNodes,
        onProgress: (current, total) => {
          setImportProgress(Math.round((current / total) * 100));
        },
      });

      setImportResult(result);
      setStep('result');
    } catch (error) {
      setStep('preview');
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Questions sheet
    const questionsData = [
      {
        code: 'Q001',
        type: 'MCQ_SINGLE',
        content: 'Thủ đô của Việt Nam là gì?',
        taxonomy_code: taxonomyNodes[0]?.code || 'C1',
        cognitive_level: subject.cognitive_levels[0] || 'Nhận biết',
        difficulty: 0.3,
        estimated_time: 30,
        needs_rich_edit: false,
      },
      {
        code: 'Q002',
        type: 'TRUE_FALSE_4',
        content: 'Xác định các mệnh đề sau đúng hay sai',
        taxonomy_code: taxonomyNodes[0]?.code || 'C1',
        cognitive_level: subject.cognitive_levels[1] || 'Thông hiểu',
        difficulty: 0.5,
        estimated_time: 60,
        needs_rich_edit: false,
      },
      {
        code: 'Q003',
        type: 'SHORT_ANSWER',
        content: 'Tên thủ đô của Nhật Bản là gì?',
        taxonomy_code: '',
        cognitive_level: subject.cognitive_levels[0] || 'Nhận biết',
        difficulty: 0.3,
        estimated_time: 30,
        needs_rich_edit: false,
      },
    ];
    const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
    XLSX.utils.book_append_sheet(wb, questionsSheet, 'Questions');

    // MCQ_Options sheet
    const mcqData = [
      {
        question_code: 'Q001',
        option_A: 'Hà Nội',
        option_B: 'TP. Hồ Chí Minh',
        option_C: 'Đà Nẵng',
        option_D: 'Huế',
        correct: 'A',
      },
    ];
    const mcqSheet = XLSX.utils.json_to_sheet(mcqData);
    XLSX.utils.book_append_sheet(wb, mcqSheet, 'MCQ_Options');

    // TF_Statements sheet
    const tfData = [
      {
        question_code: 'Q002',
        statement_1: 'Trái đất quay quanh mặt trời',
        is_true_1: true,
        statement_2: 'Mặt trăng tự phát sáng',
        is_true_2: false,
        statement_3: 'Nước sôi ở 100 độ C',
        is_true_3: true,
        statement_4: 'Trái đất là hành tinh lớn nhất',
        is_true_4: false,
      },
    ];
    const tfSheet = XLSX.utils.json_to_sheet(tfData);
    XLSX.utils.book_append_sheet(wb, tfSheet, 'TF_Statements');

    // Short_Answers sheet
    const shortData = [
      {
        question_code: 'Q003',
        accepted_answers: 'Tokyo, Tô-ky-ô',
        case_sensitive: false,
      },
    ];
    const shortSheet = XLSX.utils.json_to_sheet(shortData);
    XLSX.utils.book_append_sheet(wb, shortSheet, 'Short_Answers');

    // Coding_TestCases sheet
    const codingTestData = [
      {
        question_code: 'Q004',
        test_order: 1,
        input: '1 2',
        expected_output: '3',
        is_hidden: false,
        weight: 1,
      },
      {
        question_code: 'Q004',
        test_order: 2,
        input: '10 20',
        expected_output: '30',
        is_hidden: true,
        weight: 2,
      },
    ];
    const codingTestSheet = XLSX.utils.json_to_sheet(codingTestData);
    XLSX.utils.book_append_sheet(wb, codingTestSheet, 'Coding_TestCases');

    // Coding_Config sheet
    const codingConfigData = [
      {
        question_code: 'Q004',
        languages: 'python,javascript',
        default_language: 'python',
        time_limit: 5,
        memory_limit: 256,
        scoring_method: 'proportional',
        starter_code_python: '# Viết code ở đây',
        starter_code_javascript: '// Viết code ở đây',
      },
    ];
    const codingConfigSheet = XLSX.utils.json_to_sheet(codingConfigData);
    XLSX.utils.book_append_sheet(wb, codingConfigSheet, 'Coding_Config');

    // Lookups sheet - taxonomy codes and cognitive levels
    const lookupsData = [
      { category: 'Loại câu hỏi', value: 'MCQ_SINGLE', description: 'Trắc nghiệm 1 đáp án' },
      { category: 'Loại câu hỏi', value: 'TRUE_FALSE_4', description: 'Đúng/Sai 4 mệnh đề' },
      { category: 'Loại câu hỏi', value: 'SHORT_ANSWER', description: 'Trả lời ngắn' },
      { category: 'Loại câu hỏi', value: 'CODING', description: 'Lập trình' },
      ...subject.cognitive_levels.map(level => ({
        category: 'Mức độ nhận thức',
        value: level,
        description: '',
      })),
      ...taxonomyNodes.map(node => ({
        category: `Phân loại (Level ${node.level})`,
        value: node.code,
        description: node.name,
      })),
    ];
    const lookupsSheet = XLSX.utils.json_to_sheet(lookupsData);
    XLSX.utils.book_append_sheet(wb, lookupsSheet, 'Lookups');

    // Instructions sheet
    const instructionsData = [
      { 'Hướng dẫn sử dụng': '' },
      { 'Hướng dẫn sử dụng': '1. Sheet "Questions": Điền thông tin chính của câu hỏi' },
      { 'Hướng dẫn sử dụng': '   - code: Mã câu hỏi (bắt buộc, duy nhất)' },
      { 'Hướng dẫn sử dụng': '   - type: Loại câu (MCQ_SINGLE, TRUE_FALSE_4, SHORT_ANSWER, CODING)' },
      { 'Hướng dẫn sử dụng': '   - content: Nội dung câu hỏi (text thuần)' },
      { 'Hướng dẫn sử dụng': '   - taxonomy_code: Mã phân loại (xem sheet Lookups)' },
      { 'Hướng dẫn sử dụng': '   - cognitive_level: Mức độ nhận thức (xem sheet Lookups)' },
      { 'Hướng dẫn sử dụng': '   - difficulty: Độ khó (0-1, mặc định 0.5)' },
      { 'Hướng dẫn sử dụng': '   - estimated_time: Thời gian dự kiến (giây)' },
      { 'Hướng dẫn sử dụng': '   - needs_rich_edit: TRUE nếu cần format thêm trong hệ thống' },
      { 'Hướng dẫn sử dụng': '' },
      { 'Hướng dẫn sử dụng': '2. Sheet "MCQ_Options": Đáp án cho câu trắc nghiệm' },
      { 'Hướng dẫn sử dụng': '   - question_code: Mã câu hỏi tương ứng' },
      { 'Hướng dẫn sử dụng': '   - option_A/B/C/D: Nội dung các đáp án' },
      { 'Hướng dẫn sử dụng': '   - correct: Đáp án đúng (A/B/C/D)' },
      { 'Hướng dẫn sử dụng': '' },
      { 'Hướng dẫn sử dụng': '3. Sheet "TF_Statements": Mệnh đề Đúng/Sai' },
      { 'Hướng dẫn sử dụng': '   - statement_1 đến statement_4: Các mệnh đề' },
      { 'Hướng dẫn sử dụng': '   - is_true_1 đến is_true_4: TRUE hoặc FALSE' },
      { 'Hướng dẫn sử dụng': '' },
      { 'Hướng dẫn sử dụng': '4. Sheet "Short_Answers": Đáp án trả lời ngắn' },
      { 'Hướng dẫn sử dụng': '   - accepted_answers: Các đáp án được chấp nhận, cách nhau bởi dấu phẩy' },
      { 'Hướng dẫn sử dụng': '   - case_sensitive: TRUE nếu phân biệt hoa/thường' },
      { 'Hướng dẫn sử dụng': '' },
      { 'Hướng dẫn sử dụng': '5. Sheet "Coding_TestCases": Test case cho câu lập trình' },
      { 'Hướng dẫn sử dụng': '6. Sheet "Coding_Config": Cấu hình câu lập trình' },
      { 'Hướng dẫn sử dụng': '7. Sheet "Lookups": Danh sách các giá trị hợp lệ' },
    ];
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

    // Download
    XLSX.writeFile(wb, `import-template-${subject.code}.xlsx`);
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setParsedQuestions([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  const validQuestions = parsedQuestions.filter(
    q => !validationErrors.some(e => e.row > 1) // Filter based on row errors
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import câu hỏi từ Excel
          </DialogTitle>
          <DialogDescription>
            Môn học: <strong>{subject.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              {/* Download Template */}
              <div className="border border-dashed border-border rounded-lg p-6 text-center">
                <Download className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-medium mb-2">Bước 1: Tải template Excel</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Template đã được điền sẵn danh sách phân loại và mức độ của môn{' '}
                  <strong>{subject.name}</strong>
                </p>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Tải template
                </Button>
              </div>

              {/* Upload File */}
              <div className="border border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-medium mb-2">Bước 2: Upload file đã điền</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Chọn file Excel (.xlsx) chứa các câu hỏi cần import
                </p>
                <label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="default" asChild>
                    <span className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Chọn file
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{parsedQuestions.length} câu hỏi</span>
                </div>
                {validationErrors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-600">{validationErrors.length} cảnh báo</span>
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="border border-yellow-500/50 rounded-lg p-4 bg-yellow-500/10">
                  <h4 className="font-medium text-yellow-600 mb-2">Lỗi validation:</h4>
                  <ScrollArea className="h-32">
                    <ul className="text-sm space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx} className="text-yellow-700">
                          Dòng {error.row}, {error.field}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              {/* Preview Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Mã</TableHead>
                      <TableHead className="w-28">Loại</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead className="w-28">Mức độ</TableHead>
                      <TableHead className="w-20">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedQuestions.map((q, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{q.code}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {questionTypeLabels[q.question_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {q.content.slice(0, 80)}
                          {q.content.length > 80 && '...'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{q.cognitive_level || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {q.needs_rich_edit && (
                            <Badge variant="outline" className="text-yellow-600">
                              Cần sửa
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <h3 className="font-medium">Đang import câu hỏi...</h3>
              <Progress value={importProgress} className="w-64 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {importProgress}% hoàn thành
              </p>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                {importResult.failed === 0 ? (
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                ) : (
                  <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                )}
                <h3 className="text-xl font-bold mb-2">Import hoàn tất</h3>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-sm text-muted-foreground">Thành công</p>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
                      <p className="text-sm text-muted-foreground">Thất bại</p>
                    </div>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border border-red-500/50 rounded-lg p-4 bg-red-500/10">
                  <h4 className="font-medium text-red-600 mb-2">Chi tiết lỗi:</h4>
                  <ScrollArea className="h-32">
                    <ul className="text-sm space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx} className="text-red-700">
                          {error.code}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Hủy
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Quay lại
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedQuestions.length === 0}
              >
                Import {parsedQuestions.length} câu hỏi
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>Đóng</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
