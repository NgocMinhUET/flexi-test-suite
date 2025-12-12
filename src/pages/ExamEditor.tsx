import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Code2,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Question, QuestionType, ProgrammingLanguage, TestCase } from '@/types/exam';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CollapsibleQuestion } from '@/components/exam/CollapsibleQuestion';

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: 'multiple-choice', label: 'Trắc nghiệm' },
  { value: 'short-answer', label: 'Trả lời ngắn' },
  { value: 'essay', label: 'Tự luận' },
  { value: 'coding', label: 'Lập trình' },
];

const programmingLanguages: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

const scoringMethods: { value: 'proportional' | 'all-or-nothing' | 'weighted'; label: string; description: string }[] = [
  { value: 'proportional', label: 'Tỷ lệ', description: 'Điểm tính theo % test cases đạt' },
  { value: 'all-or-nothing', label: 'Tất cả hoặc không', description: 'Chỉ được điểm khi đạt tất cả test cases' },
  { value: 'weighted', label: 'Trọng số', description: 'Điểm tính theo trọng số từng test case' },
];

const ExamEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { user, isAdmin, isTeacher, isLoading: authLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapseKey, setCollapseKey] = useState(0);
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    description: '',
    duration: 60,
    is_published: false,
  });
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin && !isTeacher) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, authLoading, isAdmin, isTeacher, navigate]);

  useEffect(() => {
    if (isEditing && user) {
      fetchExam();
    }
  }, [id, user, isEditing]);

  const fetchExam = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Không tìm thấy đề thi');
        navigate('/dashboard');
        return;
      }

      setExamData({
        title: data.title,
        subject: data.subject,
        description: data.description || '',
        duration: data.duration,
        is_published: data.is_published,
      });
      setQuestions((data.questions as unknown as Question[]) || []);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast.error('Lỗi khi tải đề thi');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Date.now(),
      type,
      content: '',
      points: 1,
      options: type === 'multiple-choice' ? [
        { id: '1', text: '' },
        { id: '2', text: '' },
        { id: '3', text: '' },
        { id: '4', text: '' },
      ] : undefined,
      correctAnswer: type === 'multiple-choice' ? '' : undefined,
      coding: type === 'coding' ? {
        languages: ['python'],
        defaultLanguage: 'python',
        starterCode: { python: '# Write your code here\n', javascript: '// Write your code here\n', java: '// Write your code here\n', cpp: '// Write your code here\n', c: '// Write your code here\n', go: '// Write your code here\n', rust: '// Write your code here\n' },
        testCases: [{ id: '1', input: '', expectedOutput: '', isHidden: false, weight: 1 }],
        scoringMethod: 'proportional',
      } : undefined,
    };
    setQuestions([...questions, newQuestion]);
    // Auto expand when adding new question
    setAllCollapsed(false);
    setCollapseKey(prev => prev + 1);
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const question = questions[questionIndex];
    if (question.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], text };
      updateQuestion(questionIndex, { options: newOptions });
    }
  };

  const addTestCase = (questionIndex: number) => {
    const question = questions[questionIndex];
    if (question.coding) {
      const newTestCases: TestCase[] = [...question.coding.testCases, {
        id: Date.now().toString(),
        input: '',
        expectedOutput: '',
        isHidden: false,
        weight: 1,
      }];
      updateQuestion(questionIndex, {
        coding: { ...question.coding, testCases: newTestCases },
      });
    }
  };

  const updateTestCase = (questionIndex: number, testCaseIndex: number, updates: Partial<TestCase>) => {
    const question = questions[questionIndex];
    if (question.coding) {
      const newTestCases = [...question.coding.testCases];
      newTestCases[testCaseIndex] = { ...newTestCases[testCaseIndex], ...updates };
      updateQuestion(questionIndex, {
        coding: { ...question.coding, testCases: newTestCases },
      });
    }
  };

  const removeTestCase = (questionIndex: number, testCaseIndex: number) => {
    const question = questions[questionIndex];
    if (question.coding) {
      const newTestCases = question.coding.testCases.filter((_, i) => i !== testCaseIndex);
      updateQuestion(questionIndex, {
        coding: { ...question.coding, testCases: newTestCases },
      });
    }
  };

  const toggleCollapseAll = () => {
    setAllCollapsed(!allCollapsed);
    setCollapseKey(prev => prev + 1);
  };

  const handleSave = async () => {
    if (!examData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề đề thi');
      return;
    }
    if (!examData.subject.trim()) {
      toast.error('Vui lòng nhập môn học');
      return;
    }
    if (questions.length === 0) {
      toast.error('Vui lòng thêm ít nhất một câu hỏi');
      return;
    }

    setIsSaving(true);
    try {
      const examPayload = {
        title: examData.title,
        subject: examData.subject,
        description: examData.description,
        duration: examData.duration,
        is_published: examData.is_published,
        total_questions: questions.length,
        questions: JSON.parse(JSON.stringify(questions)),
        created_by: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('exams')
          .update(examPayload)
          .eq('id', id);
        if (error) throw error;
        toast.success('Đã cập nhật đề thi');
      } else {
        const { error } = await supabase
          .from('exams')
          .insert([examPayload]);
        if (error) throw error;
        toast.success('Đã tạo đề thi mới');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('Lỗi khi lưu đề thi');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Code2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  {isEditing ? 'Chỉnh sửa đề thi' : 'Tạo đề thi mới'}
                </span>
              </div>
            </div>

            <Button variant="hero" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Lưu
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Exam Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Thông tin đề thi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  placeholder="Nhập tiêu đề đề thi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Môn học *</Label>
                <Input
                  id="subject"
                  value={examData.subject}
                  onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                  placeholder="Nhập tên môn học"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={examData.description}
                onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                placeholder="Mô tả đề thi (không bắt buộc)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Thời gian (phút)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={examData.duration}
                  onChange={(e) => setExamData({ ...examData, duration: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Công khai</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={examData.is_published}
                    onCheckedChange={(checked) => setExamData({ ...examData, is_published: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {examData.is_published ? 'Sinh viên có thể làm bài' : 'Chỉ bạn có thể xem'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Câu hỏi ({questions.length})</h2>
            {questions.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleCollapseAll}>
                {allCollapsed ? (
                  <>
                    <ChevronsUpDown className="w-4 h-4 mr-2" />
                    Mở rộng tất cả
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="w-4 h-4 mr-2" />
                    Thu gọn tất cả
                  </>
                )}
              </Button>
            )}
          </div>

          {questions.map((question, qIndex) => (
            <CollapsibleQuestion
              key={`${question.id}-${collapseKey}`}
              question={question}
              questionIndex={qIndex}
              onTypeChange={(type) => updateQuestion(qIndex, { type })}
              onPointsChange={(points) => updateQuestion(qIndex, { points })}
              onRemove={() => removeQuestion(qIndex)}
              defaultOpen={!allCollapsed}
            >
              {/* Question Content */}
              <div className="space-y-2">
                <Label>Nội dung câu hỏi</Label>
                <RichTextEditor
                  value={question.content}
                  onChange={(content) => updateQuestion(qIndex, { content })}
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              {/* Multiple Choice Options */}
              {question.type === 'multiple-choice' && question.options && (
                <div className="space-y-3">
                  <Label>Các lựa chọn</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-start gap-3">
                      <div className="pt-3">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correctAnswer === option.id}
                          onChange={() => updateQuestion(qIndex, { correctAnswer: option.id })}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex-1">
                        <RichTextEditor
                          value={option.text}
                          onChange={(text) => updateOption(qIndex, oIndex, text)}
                          placeholder={`Lựa chọn ${String.fromCharCode(65 + oIndex)}`}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Chọn đáp án đúng bằng cách click vào radio button
                  </p>
                </div>
              )}

              {/* Short Answer */}
              {question.type === 'short-answer' && (
                <div className="space-y-2">
                  <Label>Đáp án đúng</Label>
                  <Input
                    value={question.correctAnswer as string || ''}
                    onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                    placeholder="Nhập đáp án đúng"
                  />
                </div>
              )}

              {/* Coding Question */}
              {question.type === 'coding' && question.coding && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ngôn ngữ mặc định</Label>
                      <Select
                        value={question.coding.defaultLanguage}
                        onValueChange={(value: ProgrammingLanguage) =>
                          updateQuestion(qIndex, {
                            coding: { ...question.coding!, defaultLanguage: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {programmingLanguages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Phương pháp tính điểm</Label>
                      <Select
                        value={question.coding.scoringMethod || 'proportional'}
                        onValueChange={(value: 'proportional' | 'all-or-nothing' | 'weighted') =>
                          updateQuestion(qIndex, {
                            coding: { ...question.coding!, scoringMethod: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scoringMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {scoringMethods.find(m => m.value === (question.coding?.scoringMethod || 'proportional'))?.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Code mẫu</Label>
                    <Textarea
                      value={question.coding.starterCode[question.coding.defaultLanguage] || ''}
                      onChange={(e) => {
                        const newStarterCode = {
                          ...question.coding!.starterCode,
                          [question.coding!.defaultLanguage]: e.target.value,
                        };
                        updateQuestion(qIndex, {
                          coding: { ...question.coding!, starterCode: newStarterCode },
                        });
                      }}
                      placeholder="Code khởi đầu cho sinh viên"
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Test Cases</Label>
                      <Button variant="outline" size="sm" onClick={() => addTestCase(qIndex)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Thêm test case
                      </Button>
                    </div>
                    {question.coding.testCases.map((testCase, tIndex) => (
                      <Card key={testCase.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <span className="text-sm font-medium text-foreground">Test case {tIndex + 1}</span>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground whitespace-nowrap">Trọng số:</Label>
                              <Input
                                type="number"
                                min={1}
                                value={testCase.weight || 1}
                                onChange={(e) =>
                                  updateTestCase(qIndex, tIndex, { weight: parseInt(e.target.value) || 1 })
                                }
                                className="w-16 h-7 text-xs"
                                disabled={question.coding?.scoringMethod !== 'weighted'}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={testCase.isHidden}
                                onCheckedChange={(checked) =>
                                  updateTestCase(qIndex, tIndex, { isHidden: checked })
                                }
                              />
                              <span className="text-xs text-muted-foreground">Ẩn</span>
                            </div>
                            {question.coding!.testCases.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTestCase(qIndex, tIndex)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Input</Label>
                            <Textarea
                              value={testCase.input}
                              onChange={(e) =>
                                updateTestCase(qIndex, tIndex, { input: e.target.value })
                              }
                              placeholder="Dữ liệu đầu vào"
                              rows={2}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Expected Output</Label>
                            <Textarea
                              value={testCase.expectedOutput}
                              onChange={(e) =>
                                updateTestCase(qIndex, tIndex, { expectedOutput: e.target.value })
                              }
                              placeholder="Kết quả mong đợi"
                              rows={2}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleQuestion>
          ))}

          {/* Add Question Buttons */}
          <div className="flex flex-wrap gap-2">
            {questionTypes.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                onClick={() => addQuestion(type.value)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamEditor;
