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
  CodingAnswerData,
  MCQOption,
  TrueFalseStatement,
  TestCase,
  ProgrammingLanguage,
  AnswerData,
} from '@/types/questionBank';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';
import { rust } from '@codemirror/lang-rust';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_LANGUAGES: ProgrammingLanguage[] = ['python', 'javascript', 'java', 'cpp', 'c', 'go', 'rust'];

const languageConfig: Record<ProgrammingLanguage, { name: string; extension: any }> = {
  python: { name: 'Python', extension: python() },
  javascript: { name: 'JavaScript', extension: javascript() },
  java: { name: 'Java', extension: java() },
  cpp: { name: 'C++', extension: cpp() },
  c: { name: 'C', extension: cpp() },
  go: { name: 'Go', extension: go() },
  rust: { name: 'Rust', extension: rust() },
};

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

const defaultTestCase = (): TestCase => ({
  id: generateId(),
  input: '',
  expectedOutput: '',
  isHidden: false,
  weight: 1,
  description: '',
});

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

  // Coding answer data
  const [codingLanguages, setCodingLanguages] = useState<ProgrammingLanguage[]>(['python']);
  const [defaultLanguage, setDefaultLanguage] = useState<ProgrammingLanguage>('python');
  const [starterCode, setStarterCode] = useState<Record<string, string>>({});
  const [testCases, setTestCases] = useState<TestCase[]>([defaultTestCase()]);
  const [timeLimit, setTimeLimit] = useState(5);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [scoringMethod, setScoringMethod] = useState<'proportional' | 'all-or-nothing' | 'weighted'>('proportional');
  const [selectedLangTab, setSelectedLangTab] = useState<ProgrammingLanguage>('python');

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
      } else if (existingQuestion.question_type === 'CODING') {
        const data = answerData as CodingAnswerData;
        setCodingLanguages(data.languages || ['python']);
        setDefaultLanguage(data.defaultLanguage || 'python');
        setStarterCode(data.starterCode || {});
        setTestCases(data.testCases?.length ? data.testCases : [defaultTestCase()]);
        setTimeLimit(data.timeLimit || 5);
        setMemoryLimit(data.memoryLimit || 256);
        setScoringMethod(data.scoringMethod || 'proportional');
        setSelectedLangTab(data.defaultLanguage || 'python');
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

  const buildAnswerData = (): AnswerData => {
    switch (questionType) {
      case 'MCQ_SINGLE':
        return { options: mcqOptions, explanation };
      case 'TRUE_FALSE_4':
        return { statements: tfStatements, explanation };
      case 'SHORT_ANSWER':
        return { correctAnswers: shortAnswers.filter(Boolean), caseSensitive, explanation };
      case 'CODING':
        return {
          languages: codingLanguages,
          defaultLanguage,
          starterCode: starterCode as Record<ProgrammingLanguage, string>,
          testCases,
          timeLimit,
          memoryLimit,
          scoringMethod,
          explanation,
        };
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

    if (questionType === 'CODING') {
      if (codingLanguages.length === 0) {
        toast.error('Vui lòng chọn ít nhất một ngôn ngữ lập trình');
        return false;
      }
      if (testCases.length === 0) {
        toast.error('Vui lòng thêm ít nhất một test case');
        return false;
      }
      const hasEmptyOutput = testCases.some(tc => !tc.expectedOutput.trim());
      if (hasEmptyOutput) {
        toast.error('Vui lòng nhập expected output cho tất cả test cases');
        return false;
      }
    }

    return true;
  };

  // Coding helpers
  const toggleLanguage = (lang: ProgrammingLanguage) => {
    setCodingLanguages(prev => {
      if (prev.includes(lang)) {
        if (prev.length === 1) return prev; // Keep at least one
        const newLangs = prev.filter(l => l !== lang);
        if (defaultLanguage === lang) {
          setDefaultLanguage(newLangs[0]);
          setSelectedLangTab(newLangs[0]);
        }
        return newLangs;
      }
      return [...prev, lang];
    });
  };

  const addTestCase = () => {
    setTestCases(prev => [...prev, defaultTestCase()]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length === 1) return;
    setTestCases(prev => prev.filter(tc => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const updateStarterCode = (lang: ProgrammingLanguage, code: string) => {
    setStarterCode(prev => ({ ...prev, [lang]: code }));
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
                {questionType === 'CODING' && 'Thiết lập ngôn ngữ, starter code và test cases'}
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

              {questionType === 'CODING' && (
                <div className="space-y-6">
                  {/* Languages */}
                  <div>
                    <Label>Ngôn ngữ lập trình *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ALL_LANGUAGES.map(lang => (
                        <Badge
                          key={lang}
                          variant={codingLanguages.includes(lang) ? 'default' : 'outline'}
                          className="cursor-pointer transition-colors"
                          onClick={() => toggleLanguage(lang)}
                        >
                          {languageConfig[lang].name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Default Language */}
                  <div>
                    <Label>Ngôn ngữ mặc định</Label>
                    <Select value={defaultLanguage} onValueChange={(v) => setDefaultLanguage(v as ProgrammingLanguage)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {codingLanguages.map(lang => (
                          <SelectItem key={lang} value={lang}>
                            {languageConfig[lang].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Starter Code */}
                  <div>
                    <Label>Starter Code (tùy chọn)</Label>
                    <Tabs value={selectedLangTab} onValueChange={(v) => setSelectedLangTab(v as ProgrammingLanguage)} className="mt-2">
                      <TabsList>
                        {codingLanguages.map(lang => (
                          <TabsTrigger key={lang} value={lang}>
                            {languageConfig[lang].name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {codingLanguages.map(lang => (
                        <TabsContent key={lang} value={lang}>
                          <div className="border rounded-md overflow-hidden">
                            <CodeMirror
                              value={starterCode[lang] || ''}
                              onChange={(value) => updateStarterCode(lang, value)}
                              theme={vscodeDark}
                              extensions={[languageConfig[lang].extension]}
                              height="200px"
                              placeholder={`// Starter code cho ${languageConfig[lang].name}...`}
                            />
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  {/* Test Cases */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Test Cases *</Label>
                      <Button variant="outline" size="sm" onClick={addTestCase}>
                        <Plus className="w-4 h-4 mr-1" />
                        Thêm test case
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {testCases.map((tc, index) => (
                        <Card key={tc.id} className="border-border/50">
                          <CardHeader className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">Test Case {index + 1}</span>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`hidden-${tc.id}`}
                                    checked={tc.isHidden}
                                    onCheckedChange={(c) => updateTestCase(tc.id, 'isHidden', c)}
                                  />
                                  <Label htmlFor={`hidden-${tc.id}`} className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                                    {tc.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    Ẩn
                                  </Label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeTestCase(tc.id)}
                                  disabled={testCases.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 px-4 pb-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Input</Label>
                                <Textarea
                                  value={tc.input}
                                  onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                                  placeholder="Stdin input..."
                                  rows={3}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Expected Output *</Label>
                                <Textarea
                                  value={tc.expectedOutput}
                                  onChange={(e) => updateTestCase(tc.id, 'expectedOutput', e.target.value)}
                                  placeholder="Expected stdout..."
                                  rows={3}
                                  className="font-mono text-sm"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs">Mô tả (tùy chọn)</Label>
                                <Input
                                  value={tc.description || ''}
                                  onChange={(e) => updateTestCase(tc.id, 'description', e.target.value)}
                                  placeholder="Mô tả test case..."
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Trọng số</Label>
                                <Input
                                  type="number"
                                  value={tc.weight || 1}
                                  onChange={(e) => updateTestCase(tc.id, 'weight', parseInt(e.target.value) || 1)}
                                  min={1}
                                  max={100}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Time Limit (giây)</Label>
                      <Input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 5)}
                        min={1}
                        max={30}
                      />
                    </div>
                    <div>
                      <Label>Memory Limit (MB)</Label>
                      <Input
                        type="number"
                        value={memoryLimit}
                        onChange={(e) => setMemoryLimit(parseInt(e.target.value) || 256)}
                        min={64}
                        max={512}
                      />
                    </div>
                    <div>
                      <Label>Phương thức chấm điểm</Label>
                      <Select value={scoringMethod} onValueChange={(v) => setScoringMethod(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proportional">Tỷ lệ (partial credit)</SelectItem>
                          <SelectItem value="all-or-nothing">Tất cả hoặc không</SelectItem>
                          <SelectItem value="weighted">Theo trọng số</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
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
