import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ExamTemplate, 
  MatrixConfig, 
  GenerationConstraints, 
  QuestionMapping,
  SeededRandom,
  SectionConfig
} from '@/types/examGeneration';
import { SeededRandom as SeededRandomClass } from '@/types/examGeneration';
import type { Json } from '@/integrations/supabase/types';

interface CreateTemplateData {
  name: string;
  subjectId: string;
  description?: string;
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
}

interface GenerateExamsData {
  templateId: string;
  variantCount: number;
  subjectName: string;
}

interface GenerateExamsForContestData {
  contestId: string;
  templateName: string;
  subjectId: string;
  subjectName: string;
  matrixConfig: MatrixConfig;
  constraints: GenerationConstraints;
  variantCount: number;
}

// Convert Question Bank format to Exam format
function convertToExamQuestion(question: any, position: number, points: number, optionOrder?: number[]) {
  const baseQuestion = {
    id: position,
    content: question.content,
    points,
  };

  const answerData = question.answer_data as any;

  switch (question.question_type) {
    case 'MCQ_SINGLE':
    case 'MCQ_MULTI': {
      let options = answerData?.options || [];
      let correctAnswers: string[] = [];
      
      // Apply option shuffling if optionOrder provided
      if (optionOrder && options.length > 0) {
        const originalOptions = [...options];
        options = optionOrder.map(i => originalOptions[i]);
      }
      
      // Find correct answers
      options.forEach((opt: any) => {
        if (opt.isCorrect) {
          correctAnswers.push(opt.id);
        }
      });

      return {
        ...baseQuestion,
        type: 'multiple-choice' as const,
        options: options.map((opt: any) => ({ id: opt.id, text: opt.text || opt.content || '' })),
        correctAnswer: question.question_type === 'MCQ_SINGLE' ? correctAnswers[0] : correctAnswers,
      };
    }

    case 'TRUE_FALSE_4':
    case 'TRUE_FALSE_SIMPLE': {
      const statements = answerData?.statements || [];
      return {
        ...baseQuestion,
        type: 'multiple-choice' as const,
        options: statements.map((s: any, i: number) => ({
          id: `stmt_${i}`,
          text: `${s.content} (${s.isTrue ? 'Đúng' : 'Sai'})`,
        })),
        correctAnswer: statements.filter((s: any) => s.isTrue).map((_: any, i: number) => `stmt_${i}`),
      };
    }

    case 'SHORT_ANSWER': {
      return {
        ...baseQuestion,
        type: 'short-answer' as const,
        correctAnswer: answerData?.correctAnswers?.[0] || answerData?.acceptedAnswers?.[0] || '',
      };
    }

    case 'CODING': {
      return {
        ...baseQuestion,
        type: 'coding' as const,
        coding: {
          languages: answerData?.languages || ['python'],
          defaultLanguage: answerData?.defaultLanguage || 'python',
          starterCode: answerData?.starterCode || {},
          testCases: answerData?.testCases || [],
          timeLimit: answerData?.timeLimit,
          memoryLimit: answerData?.memoryLimit,
          scoringMethod: answerData?.scoringMethod || 'proportional',
        },
      };
    }

    default:
      return {
        ...baseQuestion,
        type: 'essay' as const,
      };
  }
}

export function useExamTemplates() {
  return useQuery({
    queryKey: ['exam-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_templates')
        .select('*, subjects(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExamTemplate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: template, error } = await supabase
        .from('exam_templates')
        .insert({
          name: data.name,
          subject_id: data.subjectId,
          description: data.description,
          matrix_config: data.matrixConfig as unknown as Json,
          constraints: data.constraints as unknown as Json,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-templates'] });
      toast({ title: 'Đã lưu mẫu đề thi' });
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });
}

export function useGenerateExams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, variantCount, subjectName }: GenerateExamsData) => {
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('exam_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const matrixConfig = template.matrix_config as unknown as MatrixConfig;
      const constraints = template.constraints as unknown as GenerationConstraints;

      // Fetch all published questions for this subject
      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', template.subject_id)
        .eq('status', 'published')
        .is('deleted_at', null);

      if (questionsError) throw questionsError;

      const generatedExams = [];

      for (let i = 0; i < variantCount; i++) {
        const variantCode = String(i + 1).padStart(3, '0');
        const seed = 1000 + i;
        const rng = new SeededRandomClass(seed);

        const selectedQuestions: Array<{ question: any; points: number; optionOrder?: number[] }> = [];
        const questionMapping: QuestionMapping[] = [];

        // For each cell in matrix, select questions
        for (const cell of matrixConfig.cells) {
          if (cell.count <= 0) continue;

          // Filter questions matching cell criteria
          const pool = allQuestions?.filter((q) => {
            const matchTaxonomy = !cell.taxonomyNodeId || q.taxonomy_node_id === cell.taxonomyNodeId;
            const matchCognitive = !cell.cognitiveLevel || q.cognitive_level === cell.cognitiveLevel;
            const matchType = !cell.questionType || q.question_type === cell.questionType;
            
            // Exclude already selected questions
            const notSelected = !selectedQuestions.some(sq => sq.question.id === q.id);
            
            return matchTaxonomy && matchCognitive && matchType && notSelected;
          }) || [];

          // Select questions from pool
          const selected = rng.sample(pool, Math.min(cell.count, pool.length));
          
          selected.forEach((q) => {
            const answerData = q.answer_data as any;
            let optionOrder: number[] | undefined;

            // Shuffle MCQ options if enabled
            if (constraints.shuffleOptions && 
                (q.question_type === 'MCQ_SINGLE')) {
              const optionCount = answerData?.options?.length || 0;
              if (optionCount > 0) {
                optionOrder = rng.shuffle([...Array(optionCount).keys()]);
              }
            }

            selectedQuestions.push({ question: q, points: cell.points, optionOrder });
          });
        }

        // Shuffle question order if enabled
        let finalQuestions = [...selectedQuestions];
        if (constraints.allowShuffle) {
          finalQuestions = rng.shuffle(finalQuestions);
        }

        // Build exam questions and mapping
        const examQuestions = finalQuestions.map((sq, idx) => {
          questionMapping.push({
            bankQuestionId: sq.question.id,
            examPosition: idx + 1,
            optionOrder: sq.optionOrder,
          });

          return convertToExamQuestion(sq.question, idx + 1, sq.points, sq.optionOrder);
        });

        // Create exam record
        const { data: exam, error: examError } = await supabase
          .from('exams')
          .insert({
            title: `${template.name} - Mã ${variantCode}`,
            subject: subjectName,
            description: template.description,
            duration: matrixConfig.duration,
            total_questions: examQuestions.length,
            questions: examQuestions as unknown as Json,
            is_published: false,
          })
          .select()
          .single();

        if (examError) throw examError;

        // Create generated_exam record
        const { data: generatedExam, error: genError } = await supabase
          .from('generated_exams')
          .insert({
            template_id: templateId,
            exam_id: exam.id,
            variant_code: variantCode,
            seed,
            question_mapping: questionMapping as unknown as Json,
          })
          .select()
          .single();

        if (genError) throw genError;

        generatedExams.push({ exam, generatedExam });
      }

      return generatedExams;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-templates'] });
      toast({ 
        title: 'Sinh đề thành công', 
        description: `Đã tạo ${data.length} mã đề` 
      });
    },
    onError: (error) => {
      toast({ title: 'Lỗi sinh đề', description: error.message, variant: 'destructive' });
    },
  });
}

// Generate exams and add directly to a contest
export function useGenerateExamsForContest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contestId,
      templateName,
      subjectId,
      subjectName,
      matrixConfig,
      constraints,
      variantCount,
    }: GenerateExamsForContestData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create template first
      const { data: template, error: templateError } = await supabase
        .from('exam_templates')
        .insert({
          name: templateName,
          subject_id: subjectId,
          matrix_config: matrixConfig as unknown as Json,
          constraints: constraints as unknown as Json,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Fetch all published questions for this subject
      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'published')
        .is('deleted_at', null);

      if (questionsError) throw questionsError;

      const generatedExams = [];
      const contestExamsToAdd: { exam_id: string; variant_code: string }[] = [];

      for (let i = 0; i < variantCount; i++) {
        const variantCode = String(i + 1).padStart(3, '0');
        const seed = 1000 + i;
        const rng = new SeededRandomClass(seed);

        const selectedQuestions: Array<{ question: any; points: number; optionOrder?: number[] }> = [];
        const questionMapping: QuestionMapping[] = [];

        // For each cell in matrix, select questions
        for (const cell of matrixConfig.cells) {
          if (cell.count <= 0) continue;

          const pool = allQuestions?.filter((q) => {
            const matchTaxonomy = !cell.taxonomyNodeId || q.taxonomy_node_id === cell.taxonomyNodeId;
            const matchCognitive = !cell.cognitiveLevel || q.cognitive_level === cell.cognitiveLevel;
            const matchType = !cell.questionType || q.question_type === cell.questionType;
            const notSelected = !selectedQuestions.some(sq => sq.question.id === q.id);
            return matchTaxonomy && matchCognitive && matchType && notSelected;
          }) || [];

          const selected = rng.sample(pool, Math.min(cell.count, pool.length));

          selected.forEach((q) => {
            const answerData = q.answer_data as any;
            let optionOrder: number[] | undefined;

            if (constraints.shuffleOptions && q.question_type === 'MCQ_SINGLE') {
              const optionCount = answerData?.options?.length || 0;
              if (optionCount > 0) {
                optionOrder = rng.shuffle([...Array(optionCount).keys()]);
              }
            }

            selectedQuestions.push({ question: q, points: cell.points, optionOrder });
          });
        }

        // Group questions by section if sectioned
        let finalQuestions = [...selectedQuestions];
        let examSections: any[] | null = null;
        let totalDuration = matrixConfig.duration;

        if (constraints.isSectioned && constraints.sectionConfig.length > 0) {
          // Build sections with questions grouped by question type
          examSections = [];
          let questionPosition = 1;

          for (const sectionConfig of constraints.sectionConfig) {
            // Get questions matching this section's question types
            const sectionQuestions = selectedQuestions.filter(sq => 
              sectionConfig.questionTypes.includes(sq.question.question_type)
            );

            // Shuffle within section if enabled
            const shuffledSectionQuestions = constraints.allowShuffle 
              ? rng.shuffle(sectionQuestions) 
              : sectionQuestions;

            // Build question IDs for this section (1-based positions)
            const questionIds: number[] = [];
            shuffledSectionQuestions.forEach((sq) => {
              questionMapping.push({
                bankQuestionId: sq.question.id,
                examPosition: questionPosition,
                optionOrder: sq.optionOrder,
              });
              questionIds.push(questionPosition);
              questionPosition++;
            });

            examSections.push({
              id: sectionConfig.id,
              name: sectionConfig.name,
              description: '',
              duration: sectionConfig.duration,
              questionIds,
            });
          }

          // Build exam questions in order
          finalQuestions = [];
          for (const sectionConfig of constraints.sectionConfig) {
            const sectionQuestions = selectedQuestions.filter(sq => 
              sectionConfig.questionTypes.includes(sq.question.question_type)
            );
            const shuffledSectionQuestions = constraints.allowShuffle 
              ? rng.shuffle(sectionQuestions) 
              : sectionQuestions;
            finalQuestions.push(...shuffledSectionQuestions);
          }

          // Total duration is sum of section durations
          totalDuration = constraints.sectionConfig.reduce((sum, s) => sum + s.duration, 0);
        } else {
          // Non-sectioned: shuffle all questions if enabled
          if (constraints.allowShuffle) {
            finalQuestions = rng.shuffle(finalQuestions);
          }

          // Build question mapping for non-sectioned exam
          finalQuestions.forEach((sq, idx) => {
            questionMapping.push({
              bankQuestionId: sq.question.id,
              examPosition: idx + 1,
              optionOrder: sq.optionOrder,
            });
          });
        }

        const examQuestions = finalQuestions.map((sq, idx) => {
          return convertToExamQuestion(sq.question, idx + 1, sq.points, sq.optionOrder);
        });

        // Create exam with contest source
        const { data: exam, error: examError } = await supabase
          .from('exams')
          .insert({
            title: `${templateName} - Mã ${variantCode}`,
            subject: subjectName,
            duration: totalDuration,
            total_questions: examQuestions.length,
            questions: examQuestions as unknown as Json,
            is_published: true,
            created_by: user.user.id,
            source_type: 'contest',
            source_contest_id: contestId,
            is_sectioned: constraints.isSectioned,
            sections: examSections as unknown as Json,
          })
          .select()
          .single();

        if (examError) throw examError;

        // Create generated_exam record
        const { error: genError } = await supabase
          .from('generated_exams')
          .insert({
            template_id: template.id,
            exam_id: exam.id,
            variant_code: variantCode,
            seed,
            question_mapping: questionMapping as unknown as Json,
          });

        if (genError) throw genError;

        generatedExams.push(exam);
        contestExamsToAdd.push({ exam_id: exam.id, variant_code: variantCode });
      }

      // Add exams to contest
      const { error: contestExamError } = await supabase
        .from('contest_exams')
        .insert(contestExamsToAdd.map(e => ({
          contest_id: contestId,
          exam_id: e.exam_id,
          variant_code: e.variant_code,
        })));

      if (contestExamError) throw contestExamError;

      return generatedExams;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-templates'] });
      queryClient.invalidateQueries({ queryKey: ['contest', variables.contestId] });
      queryClient.invalidateQueries({ queryKey: ['contests'] });
      toast({
        title: 'Sinh đề thành công',
        description: `Đã tạo ${data.length} mã đề và thêm vào cuộc thi`,
      });
    },
    onError: (error) => {
      toast({ title: 'Lỗi sinh đề', description: error.message, variant: 'destructive' });
    },
  });
}
