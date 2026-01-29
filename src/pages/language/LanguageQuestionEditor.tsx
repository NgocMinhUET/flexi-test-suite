import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Headphones, BookOpen, PenTool, Mic, ChevronRight } from "lucide-react";
import { useLangSubjects } from "@/hooks/useLangSubjects";
import { useLangQuestion, useCreateLangQuestion, useUpdateLangQuestion } from "@/hooks/useLangQuestions";
import { useLangTaxonomyTree } from "@/hooks/useLangTaxonomy";
import type { 
  LangQuestionType, 
  SkillType, 
  ProficiencyLevel,
  LangQuestionFormData,
  LangAnswerData,
} from "@/types/language";

// Import editors
import { ListeningMCQEditor } from "@/components/language/editors/ListeningMCQEditor";
import { ListeningFillEditor } from "@/components/language/editors/ListeningFillEditor";
import { ReadingMCQEditor } from "@/components/language/editors/ReadingMCQEditor";
import { ReadingMatchEditor } from "@/components/language/editors/ReadingMatchEditor";
import { ReadingOrderEditor } from "@/components/language/editors/ReadingOrderEditor";
import { WritingSentenceEditor } from "@/components/language/editors/WritingSentenceEditor";
import { WritingEssayEditor } from "@/components/language/editors/WritingEssayEditor";
import { SpeakingReadEditor } from "@/components/language/editors/SpeakingReadEditor";
import { SpeakingDescribeEditor } from "@/components/language/editors/SpeakingDescribeEditor";
import { SpeakingAnswerEditor } from "@/components/language/editors/SpeakingAnswerEditor";

const SKILL_TYPES: { value: SkillType; label: string; icon: React.ElementType }[] = [
  { value: 'listening', label: 'Nghe', icon: Headphones },
  { value: 'reading', label: 'Đọc', icon: BookOpen },
  { value: 'writing', label: 'Viết', icon: PenTool },
  { value: 'speaking', label: 'Nói', icon: Mic },
];

const QUESTION_TYPES_BY_SKILL: Record<SkillType, { value: LangQuestionType; label: string }[]> = {
  listening: [
    { value: 'LISTENING_MCQ', label: 'Trắc nghiệm' },
    { value: 'LISTENING_FILL', label: 'Điền từ' },
  ],
  reading: [
    { value: 'READING_MCQ', label: 'Trắc nghiệm' },
    { value: 'READING_ORDER', label: 'Sắp xếp' },
    { value: 'READING_MATCH', label: 'Ghép cặp' },
  ],
  writing: [
    { value: 'WRITING_SENTENCE', label: 'Sắp xếp câu' },
    { value: 'WRITING_ESSAY', label: 'Viết luận' },
  ],
  speaking: [
    { value: 'SPEAKING_READ', label: 'Đọc to' },
    { value: 'SPEAKING_DESCRIBE', label: 'Mô tả hình' },
    { value: 'SPEAKING_ANSWER', label: 'Trả lời' },
  ],
};

const PROFICIENCY_LEVELS: { value: ProficiencyLevel; label: string }[] = [
  { value: 'beginner', label: 'Sơ cấp' },
  { value: 'elementary', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung cấp' },
  { value: 'upper-intermediate', label: 'Trung cao' },
  { value: 'advanced', label: 'Cao cấp' },
];

const formSchema = z.object({
  subject_id: z.string().min(1, "Vui lòng chọn môn học"),
  taxonomy_node_id: z.string().optional(),
  skill_type: z.enum(['listening', 'reading', 'writing', 'speaking']),
  question_type: z.string().min(1, "Vui lòng chọn loại câu hỏi"),
  proficiency_level: z.enum(['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced']),
  difficulty: z.number().min(1).max(5),
  estimated_time: z.number().min(1).max(600),
  points: z.number().min(0.25).max(10),
  code: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LanguageQuestionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [activeTab, setActiveTab] = useState<"config" | "content">("config");
  const [content, setContent] = useState("");
  const [answerData, setAnswerData] = useState<LangAnswerData | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [audioDuration, setAudioDuration] = useState<number>();
  const [audioTranscript, setAudioTranscript] = useState<string>();
  const [audioPlayCount, setAudioPlayCount] = useState(2);
  const [imageUrl, setImageUrl] = useState<string>();

  const { data: subjects = [] } = useLangSubjects();
  const { data: existingQuestion, isLoading: loadingQuestion } = useLangQuestion(id);
  const createMutation = useCreateLangQuestion();
  const updateMutation = useUpdateLangQuestion();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject_id: "",
      taxonomy_node_id: "",
      skill_type: "listening",
      question_type: "LISTENING_MCQ",
      proficiency_level: "intermediate",
      difficulty: 3,
      estimated_time: 60,
      points: 1,
      code: "",
    },
  });

  const selectedSubjectId = form.watch("subject_id");
  const selectedSkillType = form.watch("skill_type");
  const selectedQuestionType = form.watch("question_type") as LangQuestionType;

  const { flatNodes: taxonomyNodes = [] } = useLangTaxonomyTree(selectedSubjectId);

  // Load existing question data
  useEffect(() => {
    if (existingQuestion) {
      form.reset({
        subject_id: existingQuestion.subject_id,
        taxonomy_node_id: existingQuestion.taxonomy_node_id || "",
        skill_type: existingQuestion.skill_type as SkillType,
        question_type: existingQuestion.question_type,
        proficiency_level: existingQuestion.proficiency_level as ProficiencyLevel,
        difficulty: existingQuestion.difficulty,
        estimated_time: existingQuestion.estimated_time,
        points: existingQuestion.points,
        code: existingQuestion.code || "",
      });
      setContent(existingQuestion.content);
      setAnswerData(existingQuestion.answer_data);
      setAudioUrl(existingQuestion.audio_url || undefined);
      setAudioDuration(existingQuestion.audio_duration || undefined);
      setAudioTranscript(existingQuestion.audio_transcript || undefined);
      setAudioPlayCount(existingQuestion.audio_play_count || 2);
      setImageUrl(existingQuestion.image_url || undefined);
    }
  }, [existingQuestion, form]);

  // Reset question type when skill changes
  useEffect(() => {
    const types = QUESTION_TYPES_BY_SKILL[selectedSkillType];
    if (types.length > 0 && !types.find(t => t.value === selectedQuestionType)) {
      form.setValue("question_type", types[0].value);
    }
  }, [selectedSkillType, form, selectedQuestionType]);

  const handleSubmit = async (values: FormValues) => {
    if (!content.trim()) {
      return;
    }

    const formData: LangQuestionFormData = {
      subject_id: values.subject_id,
      taxonomy_node_id: values.taxonomy_node_id || undefined,
      code: values.code || undefined,
      question_type: values.question_type as LangQuestionType,
      skill_type: values.skill_type,
      proficiency_level: values.proficiency_level,
      difficulty: values.difficulty,
      estimated_time: values.estimated_time,
      points: values.points,
      content,
      answer_data: answerData || { options: [] },
      audio_url: audioUrl,
      audio_duration: audioDuration,
      audio_transcript: audioTranscript,
      audio_play_count: audioPlayCount,
      image_url: imageUrl,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      navigate("/language/questions");
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Generic props for all editors - use type assertion since editors handle their specific types
  const getEditorProps = () => ({
    content,
    onContentChange: setContent,
    answerData: answerData as any,
    onAnswerDataChange: setAnswerData as any,
    audioUrl,
    onAudioChange: (url?: string, duration?: number) => {
      setAudioUrl(url);
      if (duration) setAudioDuration(duration);
    },
    audioDuration,
    audioTranscript: audioTranscript || '',
    onAudioTranscriptChange: setAudioTranscript,
    audioPlayCount,
    onAudioPlayCountChange: setAudioPlayCount,
    imageUrl,
    onImageChange: setImageUrl,
  });

  const renderEditor = () => {
    const props = getEditorProps();

    switch (selectedQuestionType) {
      case 'LISTENING_MCQ':
        return <ListeningMCQEditor {...props} />;
      case 'LISTENING_FILL':
        return <ListeningFillEditor {...props} />;
      case 'READING_MCQ':
        return <ReadingMCQEditor {...props} />;
      case 'READING_MATCH':
        return <ReadingMatchEditor {...props} />;
      case 'READING_ORDER':
        return <ReadingOrderEditor {...props} />;
      case 'WRITING_SENTENCE':
        return <WritingSentenceEditor {...props} />;
      case 'WRITING_ESSAY':
        return <WritingEssayEditor {...props} />;
      case 'SPEAKING_READ':
        return <SpeakingReadEditor {...props} />;
      case 'SPEAKING_DESCRIBE':
        return <SpeakingDescribeEditor {...props} />;
      case 'SPEAKING_ANSWER':
        return <SpeakingAnswerEditor {...props} />;
      default:
        return null;
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEditing && loadingQuestion) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/language/questions")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Sửa câu hỏi" : "Tạo câu hỏi mới"}
            </h1>
            <p className="text-muted-foreground">
              Module Thi Ngoại ngữ
            </p>
          </div>
        </div>
        <Button 
          onClick={form.handleSubmit(handleSubmit)} 
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Đang lưu..." : "Lưu câu hỏi"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "config" | "content")}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="config">1. Cấu hình</TabsTrigger>
              <TabsTrigger value="content">2. Nội dung</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6 mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left column - Basic info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Thông tin cơ bản</CardTitle>
                    <CardDescription>Chọn môn học và phân loại</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Môn học *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn môn học" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxonomy_node_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phân loại</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                            value={field.value || "none"}
                            disabled={!selectedSubjectId}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn phân loại (tùy chọn)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Không phân loại</SelectItem>
                              {taxonomyNodes.map((node) => (
                                <SelectItem key={node.id} value={node.id}>
                                  {node.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mã câu hỏi</FormLabel>
                          <FormControl>
                            <Input placeholder="VD: L1-001" {...field} />
                          </FormControl>
                          <FormDescription>Để trống để tự động tạo</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Right column - Question type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Loại câu hỏi</CardTitle>
                    <CardDescription>Chọn kỹ năng và loại câu hỏi</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="skill_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kỹ năng *</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {SKILL_TYPES.map(({ value, label, icon: Icon }) => (
                              <Button
                                key={value}
                                type="button"
                                variant={field.value === value ? "default" : "outline"}
                                className="justify-start"
                                onClick={() => field.onChange(value)}
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                {label}
                              </Button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="question_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loại câu hỏi *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn loại" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {QUESTION_TYPES_BY_SKILL[selectedSkillType].map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="proficiency_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trình độ *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROFICIENCY_LEVELS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Settings row */}
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt</CardTitle>
                  <CardDescription>Điểm số, thời gian và độ khó</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Điểm</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.25"
                              min="0.25"
                              max="10"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thời gian (giây)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              max="600"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Độ khó: {field.value}/5</FormLabel>
                          <FormControl>
                            <Slider
                              min={1}
                              max={5}
                              step={1}
                              value={[field.value]}
                              onValueChange={([v]) => field.onChange(v)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={() => setActiveTab("content")}
                  disabled={!form.watch("subject_id")}
                >
                  Tiếp tục
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-6">
              {renderEditor()}
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
