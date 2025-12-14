import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubjects, useSubject } from '@/hooks/useSubjects';
import { useTaxonomyNodes } from '@/hooks/useTaxonomy';
import { useQuestion, useCreateQuestion, useUpdateQuestion, useSubmitForReview } from '@/hooks/useQuestions';
import {
  QuestionType,
  QuestionFormData,
  MCQAnswerData,
  TrueFalseAnswerData,
  ShortAnswerData,
  MCQOption,
  TrueFalseStatement,
} from '@/types/questionBank';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Code2,
  LogOut,
  Loader2,
  ArrowLeft,
  Save,
  Send,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
const questionTypeLabels: Record<QuestionType, string> = {
  MCQ_SINGLE: 'Trắc nghiệm 4 chọn 1',
  TRUE_FALSE_4: 'Đúng/Sai 4 mệnh đề',
  SHORT_ANSWER: 'Trả lời ngắn',
  CODING: 'Lập trình',
};

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

const defaultMCQOptions: MCQOption[] = [
  { id: generateId(), content: '', isCorrect: false },
  { id: generateId(), content: '', isCorrect: false },
  { id: generateId(), content: '', isCorrect: false },
  { id: generateId(), content: '', isCorrect: false },
];

const defaultTFStatements: TrueFalseStatement[] = [
  { id: generateId(), content: '', isTrue: false },
  { id: generateId(), content: '', isTrue: false },
  { id: generateId(), content: '', isTrue: false },
  { id: generateId(), content: '', isTrue: false },
];

export default function QuestionEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user, profile, isAdmin, isTeacher, isLoading: authLoading, signOut } = useAuth();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: existingQuestion, isLoading: questionLoading } = useQuestion(id);

  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const submitForReview = useSubmitForReview();

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [code, setCode] = useState('');
  const [content, setContent] = useState('');
  const [taxonomyNodeId, setTaxonomyNodeId] = useState<string>('');
  const [cognitiveLevel, setCognitiveLevel] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ_SINGLE');
  const [difficulty, setDifficulty] = useState(0.5);
  const [estimatedTime, setEstimatedTime] = useState(60);
  const [allowShuffle, setAllowShuffle] = useState(true);
  const [explanation, setExplanation] = useState('');

  // Answer data based on type
  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>(defaultMCQOptions);
  const [tfStatements, setTfStatements] = useState<TrueFalseStatement[]>(defaultTFStatements);
  const [shortAnswers, setShortAnswers] = useState<string[]>(['']);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const { data: taxonomyNodes } = useTaxonomyNodes(subjectId || undefined);
  const selectedSubject = subjects?.find((s) => s.id === subjectId);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin && !isTeacher) {
      toast.error('Bạn không có quyền truy cập trang này');
      navigate('/');
    }
  }, [user, authLoading, isAdmin, isTeacher, navigate]);

  // Load existing question data
  useEffect(() => {
    if (existingQuestion) {
      setSubjectId(existingQuestion.subject_id);
      setCode(existingQuestion.code || '');
      setContent(existingQuestion.content);
      setTaxonomyNodeId(existingQuestion.taxonomy_node_id || '');
      setCognitiveLevel(existingQuestion.cognitive_level || '');
      setQuestionType(existingQuestion.question_type);
      setDifficulty(existingQuestion.difficulty);
      setEstimatedTime(existingQuestion.estimated_time);
      setAllowShuffle(existingQuestion.allow_shuffle);

      const answerData = existingQuestion.answer_data;
      if (existingQuestion.question_type === 'MCQ_SINGLE') {
        const data = answerData as MCQAnswerData;
        setMcqOptions(data.options || defaultMCQOptions);
        setExplanation(data.explanation || '');
      } else if (existingQuestion.question_type === 'TRUE_FALSE_4') {
        const data = answerData as TrueFalseAnswerData;
        setTfStatements(data.statements || defaultTFStatements);
        setExplanation(data.explanation || '');
      } else if (existingQuestion.question_type === 'SHORT_ANSWER') {
        const data = answerData as ShortAnswerData;
        setShortAnswers(data.correctAnswers || ['']);
        setCaseSensitive(data.caseSensitive || false);
        setExplanation(data.explanation || '');
      }
    }
  }, [existingQuestion]);

  // Set default subject
  useEffect(() => {
    if (subjects?.length && !subjectId && !isEditing) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId, isEditing]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const buildAnswerData = (): MCQAnswerData | TrueFalseAnswerData | ShortAnswerData => {
    switch (questionType) {
      case 'MCQ_SINGLE':
        return { options: mcqOptions, explanation };
      case 'TRUE_FALSE_4':
        return { statements: tfStatements, explanation };
      case 'SHORT_ANSWER':
        return { correctAnswers: shortAnswers.filter(Boolean), caseSensitive, explanation };
    }
  };

  const validateForm = (): boolean => {
    if (!subjectId) {
      toast.error('Vui lòng chọn môn học');
      return false;
    }
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi');
      return false;
    }

    if (questionType === 'MCQ_SINGLE') {
      const hasCorrect = mcqOptions.some((o) => o.isCorrect);
      const hasEmptyOption = mcqOptions.some((o) => !o.content.trim());
      if (!hasCorrect) {
        toast.error('Vui lòng chọn đáp án đúng');
        return false;
      }
      if (hasEmptyOption) {
        toast.error('Vui lòng nhập nội dung cho tất cả các đáp án');
        return false;
      }
    }

    if (questionType === 'TRUE_FALSE_4') {
      const hasEmpty = tfStatements.some((s) => !s.content.trim());
      if (hasEmpty) {
        toast.error('Vui lòng nhập nội dung cho tất cả các mệnh đề');
        return false;
      }
    }

    if (questionType === 'SHORT_ANSWER') {
      if (shortAnswers.filter(Boolean).length === 0) {
        toast.error('Vui lòng nhập ít nhất một đáp án đúng');
        return false;
      }
    }

    return true;
  };

  const handleSave = async (submitReview = false) => {
    if (!validateForm()) return;

    const formData: QuestionFormData = {
      subject_id: subjectId,
      code: code || undefined,
      content,
      taxonomy_node_id: taxonomyNodeId || undefined,
      cognitive_level: cognitiveLevel || undefined,
      question_type: questionType,
      answer_data: buildAnswerData(),
      difficulty,
      estimated_time: estimatedTime,
      allow_shuffle: allowShuffle,
    };

    try {
      if (isEditing) {
        await updateQuestion.mutateAsync({ id, data: formData });
        if (submitReview) {
          await submitForReview.mutateAsync(id);
        }
      } else {
        const result = await createQuestion.mutateAsync(formData);
        if (submitReview && result) {
          await submitForReview.mutateAsync(result.id);
        }
      }
      navigate('/questions');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleMCQOptionChange = (index: number, field: keyof MCQOption, value: string | boolean) => {
    setMcqOptions((prev) => {
      const newOptions = [...prev];
      if (field === 'isCorrect') {
        // Only one correct answer for MCQ_SINGLE
        newOptions.forEach((o, i) => (o.isCorrect = i === index));
      } else {
        (newOptions[index] as any)[field] = value;
      }
      return newOptions;
    });
  };

  const handleTFStatementChange = (index: number, field: keyof TrueFalseStatement, value: string | boolean) => {
    setTfStatements((prev) => {
      const newStatements = [...prev];
      (newStatements[index] as any)[field] = value;
      return newStatements;
    });
  };

  const isLoading = authLoading || subjectsLoading || (isEditing && questionLoading);
  const isSaving = createQuestion.isPending || updateQuestion.isPending || submitForReview.isPending;

  if (isLoading) {
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
            <Link to="/questions" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Code2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Pro</span>
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Admin' : 'Giáo viên'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/questions" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Ngân hàng câu hỏi
          </Link>
          <span>/</span>
          <span className="text-foreground">{isEditing ? 'Chỉnh sửa' : 'Thêm mới'}</span>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
          </h1>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Môn học *</Label>
                  <Select value={subjectId} onValueChange={setSubjectId} disabled={isEditing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn môn học" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mã câu hỏi</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Tự động tạo nếu để trống"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>Phân loại</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Chương/Bài</Label>
                  <Select
                    value={taxonomyNodeId || 'none'}
                    onValueChange={(v) => setTaxonomyNodeId(v === 'none' ? '' : v)}
                    disabled={!subjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phân loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Không chọn --</SelectItem>
                      {taxonomyNodes?.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {'  '.repeat(n.level)}{n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mức độ nhận thức</Label>
                  <Select
                    value={cognitiveLevel || 'none'}
                    onValueChange={(v) => setCognitiveLevel(v === 'none' ? '' : v)}
                    disabled={!subjectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mức độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Không chọn --</SelectItem>
                      {selectedSubject?.cognitive_levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Độ khó: {Math.round(difficulty * 100)}%</Label>
                  <Slider
                    value={[difficulty]}
                    onValueChange={([v]) => setDifficulty(v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Thời gian ước tính (giây)</Label>
                  <Input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 60)}
                    min={10}
                    max={600}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Nội dung câu hỏi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Loại câu hỏi</Label>
                <RadioGroup
                  value={questionType}
                  onValueChange={(v) => setQuestionType(v as QuestionType)}
                  className="flex flex-wrap gap-4 mt-2"
                >
                  {Object.entries(questionTypeLabels).map(([type, label]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={type} />
                      <Label htmlFor={type} className="cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label>Nội dung câu hỏi *</Label>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Answers */}
          <Card>
            <CardHeader>
              <CardTitle>Đáp án</CardTitle>
              <CardDescription>
                {questionType === 'MCQ_SINGLE' && 'Chọn 1 đáp án đúng'}
                {questionType === 'TRUE_FALSE_4' && 'Đánh dấu mệnh đề đúng/sai'}
                {questionType === 'SHORT_ANSWER' && 'Nhập các đáp án được chấp nhận'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionType === 'MCQ_SINGLE' && (
                <>
                  {mcqOptions.map((option, index) => (
                    <div key={option.id} className="flex items-start gap-3">
                      <RadioGroup
                        value={mcqOptions.findIndex((o) => o.isCorrect).toString()}
                        onValueChange={(v) =>
                          handleMCQOptionChange(parseInt(v), 'isCorrect', true)
                        }
                      >
                        <RadioGroupItem value={index.toString()} />
                      </RadioGroup>
                      <div className="flex-1">
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          {String.fromCharCode(65 + index)}.
                        </Label>
                        <RichTextEditor
                          value={option.content}
                          onChange={(v) => handleMCQOptionChange(index, 'content', v)}
                          placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="shuffle"
                      checked={allowShuffle}
                      onCheckedChange={(c) => setAllowShuffle(c as boolean)}
                    />
                    <Label htmlFor="shuffle">Cho phép trộn thứ tự đáp án</Label>
                  </div>
                </>
              )}

              {questionType === 'TRUE_FALSE_4' && (
                <>
                  {tfStatements.map((statement, index) => (
                    <div key={statement.id} className="flex items-start gap-3">
                      <Checkbox
                        checked={statement.isTrue}
                        onCheckedChange={(c) =>
                          handleTFStatementChange(index, 'isTrue', c as boolean)
                        }
                      />
                      <div className="flex-1">
                        <Label className="text-sm text-muted-foreground mb-1 block">
                          Mệnh đề {String.fromCharCode(97 + index)})
                        </Label>
                        <RichTextEditor
                          value={statement.content}
                          onChange={(v) => handleTFStatementChange(index, 'content', v)}
                          placeholder={`Mệnh đề ${String.fromCharCode(97 + index)}`}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {questionType === 'SHORT_ANSWER' && (
                <>
                  {shortAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...shortAnswers];
                          newAnswers[index] = e.target.value;
                          setShortAnswers(newAnswers);
                        }}
                        placeholder={`Đáp án ${index + 1}`}
                      />
                      {shortAnswers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShortAnswers(shortAnswers.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShortAnswers([...shortAnswers, ''])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm đáp án
                  </Button>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="case"
                      checked={caseSensitive}
                      onCheckedChange={(c) => setCaseSensitive(c as boolean)}
                    />
                    <Label htmlFor="case">Phân biệt chữ hoa/thường</Label>
                  </div>
                </>
              )}

              <div>
                <Label>Giải thích (tùy chọn)</Label>
                <RichTextEditor
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="Giải thích đáp án..."
                  className="mt-2"
                  compact
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" asChild>
              <Link to="/questions">Hủy</Link>
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Lưu nháp
            </Button>
            <Button variant="hero" onClick={() => handleSave(true)} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-2" />
              Gửi duyệt
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
