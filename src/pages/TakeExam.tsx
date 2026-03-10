import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { QuestionNavigation } from '@/components/exam/QuestionNavigation';
import { SectionedQuestionNavigation } from '@/components/exam/SectionedQuestionNavigation';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { SectionTransitionDialog } from '@/components/exam/SectionTransitionDialog';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useSectionedTimer } from '@/hooks/useSectionedTimer';
import { useExamAutoSave } from '@/hooks/useExamAutoSave';
import { useBackgroundGrading } from '@/hooks/useBackgroundGrading';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExamData, Question, Answer, QuestionStatus, ExamResult, QuestionResult, QuestionType, ViolationStats, ExamSection } from '@/types/exam';
import { createDefaultByTypeStats } from '@/utils/questionTypeStats';
import { Loader2, Maximize, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TakeExam = () => {
  const navigate = useNavigate();
  const { id: examId } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<{ current: number; total: number } | null>(null);
  const [showBackgroundGradingUI, setShowBackgroundGradingUI] = useState(false);
  const startTimeRef = useRef(Date.now());
  
  // Fullscreen and violation tracking
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const violationStatsRef = useRef<ViolationStats>({ tabSwitchCount: 0, fullscreenExitCount: 0 });
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedTimeLeft, setSavedTimeLeft] = useState<number | undefined>(undefined);

  // Sectioned exam state
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [showSectionTransitionDialog, setShowSectionTransitionDialog] = useState(false);
  const [isSectionTimeUp, setIsSectionTimeUp] = useState(false);
  const [sectionTimes, setSectionTimes] = useState<Record<string, number>>({});

  // Ref to track current timer value for auto-save (updated by timer hook)
  const currentTimeLeftRef = useRef<number | undefined>(undefined);

  // Fullscreen management - moved up to be available for restore
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      toast.error('Không thể vào chế độ toàn màn hình');
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    setIsFullscreen(false);
  }, []);

  // Background grading hook
  const { job: gradingJob, isGrading: isBackgroundGrading, startBackgroundGrading } = useBackgroundGrading({
    onComplete: async (resultData) => {
      console.log('Background grading completed:', resultData);
      
      // Clear draft after successful submission
      await clearDraft();
      
      toast.success('Chấm bài hoàn thành!', {
        description: `Điểm số: ${resultData.percentage.toFixed(1)}%`,
      });
      
      // Navigate to result page
      navigate(`/exam/${examId}/result`);
    },
    onError: (error) => {
      console.error('Background grading failed:', error);
      toast.error('Lỗi khi chấm bài', {
        description: 'Vui lòng thử lại hoặc liên hệ hỗ trợ.',
      });
      setShowBackgroundGradingUI(false);
      setIsSubmitting(false);
    },
  });

  // Auto-save hook - Note: check for draft even before exam started
  const {
    saveStatus,
    lastSavedAt,
    hasDraft,
    draftData,
    restoreFromDraft,
    clearDraft,
    dismissDraft,
  } = useExamAutoSave({
    examId: examId || '',
    userId: user?.id || '',
    answers,
    flaggedQuestions,
    currentQuestion,
    violationStats: violationStatsRef.current,
    isEnabled: examStarted && !isSubmitting && !!exam,
    timeLeft: exam?.isSectioned ? undefined : currentTimeLeftRef.current, // Save timer state via ref
    currentSection: exam?.isSectioned ? currentSection : undefined,
    completedSections: exam?.isSectioned ? completedSections : undefined,
    sectionTimes: exam?.isSectioned ? sectionTimes : undefined,
  });

  // Show restore dialog when draft is found
  useEffect(() => {
    if (hasDraft && draftData && !examStarted) {
      setShowRestoreDialog(true);
    }
  }, [hasDraft, draftData, examStarted]);

  // Handle restore from draft
  const handleRestoreDraft = useCallback(() => {
    if (!draftData) return;

    // Restore answers - CRITICAL: parse key as number only if it's a valid number
    // This prevents NaN when keys are UUIDs (strings)
    const restoredAnswers = new Map<number, Answer>();
    Object.entries(draftData.answers).forEach(([key, value]) => {
      // Try to parse as number, but only if it's actually numeric
      const numKey = Number(key);
      if (!isNaN(numKey)) {
        restoredAnswers.set(numKey, value);
      } else {
        // For non-numeric keys (like UUIDs), we need to match by finding the question
        // This is a fallback - ideally keys should be consistent
        console.warn('Non-numeric answer key found:', key);
      }
    });
    setAnswers(restoredAnswers);

    // Restore flagged questions
    setFlaggedQuestions(new Set(draftData.flaggedQuestions));

    // Restore current question
    setCurrentQuestion(draftData.currentQuestion);

    // Restore violation stats
    if (draftData.violationStats) {
      violationStatsRef.current = draftData.violationStats;
    }

    // Restore timer state (critical for continuing exam)
    if (draftData.timeLeft !== undefined && draftData.timeLeft > 0) {
      setSavedTimeLeft(draftData.timeLeft);
    }

    // Restore section state if available
    if (draftData.currentSection !== undefined) {
      setCurrentSection(draftData.currentSection);
    }
    if (draftData.completedSections) {
      setCompletedSections(new Set(draftData.completedSections));
    }
    if (draftData.sectionTimes) {
      setSectionTimes(draftData.sectionTimes);
    }

    restoreFromDraft();
    setShowRestoreDialog(false);
    
    // Auto-start exam after restoration
    setExamStarted(true);
    enterFullscreen();
  }, [draftData, restoreFromDraft, enterFullscreen]);

  // Handle dismiss draft
  const handleDismissDraft = useCallback(() => {
    dismissDraft();
    setShowRestoreDialog(false);
  }, [dismissDraft]);

  // Handle fullscreen change detection
  useEffect(() => {
    if (!examStarted || isSubmitting) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && examStarted && !isSubmitting) {
        violationStatsRef.current.fullscreenExitCount += 1;
        setShowViolationWarning(true);
        toast.warning(`Cảnh báo: Bạn đã thoát chế độ toàn màn hình (${violationStatsRef.current.fullscreenExitCount} lần)`);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examStarted, isSubmitting]);

  // Handle window focus loss detection (Alt+Tab, click outside, etc.)
  useEffect(() => {
    if (!examStarted || isSubmitting) return;

    let lastBlurTime = 0;
    const DEBOUNCE_MS = 500; // Avoid duplicate counting

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastBlurTime < DEBOUNCE_MS) return;
      lastBlurTime = now;

      violationStatsRef.current.tabSwitchCount += 1;
      setShowViolationWarning(true);
      toast.warning(`Cảnh báo: Bạn đã rời khỏi cửa sổ thi (${violationStatsRef.current.tabSwitchCount} lần)`);
    };

    const handleVisibilityChange = () => {
      // Only count if not already counted by blur (debounce)
      if (document.hidden) {
        const now = Date.now();
        if (now - lastBlurTime < DEBOUNCE_MS) return;
        lastBlurTime = now;

        violationStatsRef.current.tabSwitchCount += 1;
        setShowViolationWarning(true);
        toast.warning(`Cảnh báo: Bạn đã rời khỏi cửa sổ thi (${violationStatsRef.current.tabSwitchCount} lần)`);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examStarted, isSubmitting]);

  // Prevent accidental page leave while taking exam
  useEffect(() => {
    if (!exam || isSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn đang làm bài thi. Bạn có chắc muốn rời trang?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [exam, isSubmitting]);

  // Fetch exam data and check assignment
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) {
        setError('Không tìm thấy ID bài thi');
        setIsLoadingExam(false);
        return;
      }

      if (!user) {
        setIsLoadingExam(false);
        return;
      }

      try {
        // First check if user has already submitted this exam
        const { data: existingResult, error: resultError } = await supabase
          .from('exam_results')
          .select('id, submitted_at')
          .eq('exam_id', examId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (resultError) throw resultError;

        if (existingResult) {
          // User has already submitted - redirect to results
          toast.info('Bạn đã nộp bài thi này rồi');
          navigate(`/exam/${examId}/result`);
          return;
        }

        // Xác định quyền làm bài: gán trực tiếp hay qua cuộc thi
        let assignment: { start_time: string | null; end_time: string | null } | null = null;
        let isContestExam = false;

        // 1) Gán trực tiếp qua exam_assignments
        const { data: directAssignment, error: assignmentError } = await supabase
          .from('exam_assignments')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignmentError) throw assignmentError;

        if (directAssignment) {
          assignment = {
            start_time: directAssignment.start_time,
            end_time: directAssignment.end_time,
          };
        } else {
          // 2) Gán qua cuộc thi (contest_participants + contests)
          const { data: contestAssignment, error: contestAssignmentError } = await supabase
            .from('contest_participants')
            .select(`
              id,
              assigned_exam_id,
              assigned_at,
              contest:contests!inner (
                id,
                status,
                start_time,
                end_time
              )
            `)
            .eq('assigned_exam_id', examId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (contestAssignmentError) throw contestAssignmentError;

          if (contestAssignment) {
            const contest = (contestAssignment as any).contest;

            // Chỉ cho làm bài khi cuộc thi đang ở trạng thái active
            if (!contest || contest.status !== 'active') {
              setError('Cuộc thi không ở trạng thái đang diễn ra');
              setIsLoadingExam(false);
              return;
            }

            assignment = {
              start_time: contest.start_time,
              end_time: contest.end_time,
            };
            isContestExam = true;
          }
        }

        if (!assignment) {
          setError('Bạn không được phép làm bài thi này');
          setIsLoadingExam(false);
          return;
        }

        // Check time constraints if set
        const now = new Date();
        if (assignment.start_time && now < new Date(assignment.start_time)) {
          setError(`Bài thi chưa bắt đầu. Thời gian bắt đầu: ${new Date(assignment.start_time).toLocaleString('vi-VN')}`);
          setIsLoadingExam(false);
          return;
        }
        if (assignment.end_time && now > new Date(assignment.end_time)) {
          setError(`Bài thi đã kết thúc vào: ${new Date(assignment.end_time).toLocaleString('vi-VN')}`);
          setIsLoadingExam(false);
          return;
        }

        // Fetch exam data
        // Đề cuộc thi: không cần check is_published (quản lý bởi trạng thái cuộc thi)
        // Đề gán trực tiếp: vẫn cần check is_published
        let query = supabase
          .from('exams')
          .select('*')
          .eq('id', examId);
        
        if (!isContestExam) {
          query = query.eq('is_published', true);
        }
        
        const { data, error: fetchError } = await query.maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError(isContestExam ? 'Bài thi không tồn tại' : 'Bài thi không tồn tại hoặc chưa được công khai');
          setIsLoadingExam(false);
          return;
        }

        // Transform database data to ExamData type
        const examData: ExamData = {
          id: data.id,
          title: data.title,
          subject: data.subject,
          duration: data.duration,
          totalQuestions: data.total_questions,
          questions: (data.questions as unknown as Question[]) || [],
          isSectioned: data.is_sectioned || false,
          sections: (data.sections as unknown as ExamSection[]) || [],
        };

        setExam(examData);
        startTimeRef.current = Date.now();
      } catch (err) {
        console.error('Error fetching exam:', err);
        setError('Lỗi khi tải bài thi');
      } finally {
        setIsLoadingExam(false);
      }
    };

    if (!authLoading) {
      fetchExam();
    }
  }, [examId, user, authLoading, navigate]);

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C+';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  // Calculate coding question score based on test results
  const calculateCodingScore = (
    testResults: { passed: boolean; isHidden: boolean }[],
    testCases: { isHidden: boolean; weight?: number }[],
    maxPoints: number,
    scoringMethod: 'proportional' | 'all-or-nothing' | 'weighted' = 'proportional'
  ): { earnedPoints: number; isCorrect: boolean; isPartial: boolean } => {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    
    if (totalTests === 0) {
      return { earnedPoints: 0, isCorrect: false, isPartial: false };
    }

    switch (scoringMethod) {
      case 'all-or-nothing':
        // Full points only if ALL tests pass
        const allPassed = passedTests === totalTests;
        return { 
          earnedPoints: allPassed ? maxPoints : 0, 
          isCorrect: allPassed,
          isPartial: false
        };
      
      case 'weighted':
        // Calculate based on weight of each test case
        let totalWeight = 0;
        let earnedWeight = 0;
        
        testResults.forEach((result, index) => {
          const weight = testCases[index]?.weight || 1;
          totalWeight += weight;
          if (result.passed) {
            earnedWeight += weight;
          }
        });
        
        const weightedPoints = totalWeight > 0 
          ? Math.round((earnedWeight / totalWeight) * maxPoints * 100) / 100
          : 0;
        
        return { 
          earnedPoints: weightedPoints, 
          isCorrect: passedTests === totalTests,
          isPartial: passedTests > 0 && passedTests < totalTests
        };
      
      case 'proportional':
      default:
        // Points proportional to passed tests
        const proportionalPoints = Math.round((passedTests / totalTests) * maxPoints * 100) / 100;
        return { 
          earnedPoints: proportionalPoints, 
          isCorrect: passedTests === totalTests,
          isPartial: passedTests > 0 && passedTests < totalTests
        };
    }
  };

  const calculateResults = useCallback(async (): Promise<ExamResult | null> => {
    if (!exam) return null;

    const questionResults: QuestionResult[] = [];
    let totalEarned = 0;
    const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);
    
    // Separate coding and non-coding questions for parallel processing
    const codingQuestions = exam.questions.filter(q => q.type === 'coding' && q.coding);
    const nonCodingQuestions = exam.questions.filter(q => q.type !== 'coding');
    const totalCodingQuestions = codingQuestions.length;
    
    if (totalCodingQuestions > 0) {
      setGradingProgress({ current: 0, total: totalCodingQuestions });
    }
    
    const byType = createDefaultByTypeStats();

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let partialCreditCount = 0;

    // Results map to preserve order
    const resultsMap = new Map<number, QuestionResult>();

    // Process non-coding questions first (instant grading)
    for (const question of nonCodingQuestions) {
      const answer = answers.get(question.id);
      const userAnswer = answer?.answer || '';
      let isCorrect = false;
      let isPartial = false;
      let earnedPoints = 0;

      byType[question.type].total += 1;

      if (!answer || (typeof userAnswer === 'string' && !userAnswer.trim())) {
        unansweredCount++;
      } else {
        if (question.type === 'multiple-choice') {
          if (Array.isArray(question.correctAnswer)) {
            // Multi-select MCQ
            const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            const correctArray = question.correctAnswer;
            isCorrect = correctArray.length === userAnswerArray.length &&
              correctArray.every((a: string) => userAnswerArray.includes(a));
          } else {
            // Single-select MCQ
            const normalizedUser = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
            isCorrect = normalizedUser === question.correctAnswer;
          }
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'short-answer') {
          const normalizedUser = String(userAnswer).toLowerCase().trim().replace(/\s+/g, '');
          const normalizedCorrect = String(question.correctAnswer || '').toLowerCase().trim().replace(/\s+/g, '');
          isCorrect = normalizedUser === normalizedCorrect;
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'essay') {
          const wordCount = String(userAnswer).trim().split(/\s+/).length;
          if (wordCount >= 50) {
            earnedPoints = Math.ceil(question.points * 0.7);
            isPartial = true;
          } else if (wordCount >= 20) {
            earnedPoints = Math.ceil(question.points * 0.5);
            isPartial = true;
          } else if (wordCount >= 5) {
            earnedPoints = Math.ceil(question.points * 0.3);
            isPartial = true;
          } else {
            earnedPoints = 0;
          }
          isCorrect = earnedPoints > 0;
        }

        if (isCorrect) {
          correctCount++;
          byType[question.type].correct += 1;
        } else if (isPartial) {
          partialCreditCount++;
          byType[question.type].partial = (byType[question.type].partial || 0) + 1;
        } else {
          incorrectCount++;
        }

        byType[question.type].points += earnedPoints;
        totalEarned += earnedPoints;
      }

      resultsMap.set(question.id, {
        questionId: question.id,
        isCorrect,
        earnedPoints,
        maxPoints: question.points,
        userAnswer,
        correctAnswer: question.correctAnswer,
      });
    }

    // Process coding questions in PARALLEL for faster grading
    if (codingQuestions.length > 0) {
      byType['coding'].total = codingQuestions.length;
      
      let processedCount = 0;
      
      // Grade function for a single coding question
      const gradeCodingQuestion = async (question: Question): Promise<{
        question: Question;
        isCorrect: boolean;
        isPartial: boolean;
        earnedPoints: number;
        codingResults: QuestionResult['codingResults'];
        userAnswer: string;
      }> => {
        const answer = answers.get(question.id);
        const rawAnswer = answer?.answer || '';
        const userAnswer = Array.isArray(rawAnswer) ? rawAnswer.join('') : String(rawAnswer);
        let isCorrect = false;
        let isPartial = false;
        let earnedPoints = 0;
        let codingResults: QuestionResult['codingResults'] = undefined;

        if (!answer || !userAnswer.trim()) {
          return { question, isCorrect, isPartial, earnedPoints, codingResults, userAnswer };
        }

        try {
          const { data, error } = await supabase.functions.invoke('execute-code', {
            body: {
              code: userAnswer,
              language: answer.language || question.coding!.defaultLanguage,
              testCases: question.coding!.testCases.map((tc) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                weight: tc.weight || 1,
              })),
              timeLimit: question.coding!.timeLimit || 5,
              memoryLimit: question.coding!.memoryLimit || 256,
              includeHidden: true,
            },
          });

          // Update progress as each coding question completes
          processedCount++;
          setGradingProgress({ current: processedCount, total: totalCodingQuestions });

          if (!error && data?.success) {
            const testResults = data.results;
            const scoringMethod = question.coding!.scoringMethod || 'proportional';
            
            const scoreResult = calculateCodingScore(
              testResults.map((r: { passed: boolean }, idx: number) => ({
                passed: r.passed,
                isHidden: question.coding!.testCases[idx]?.isHidden || false
              })),
              question.coding!.testCases,
              question.points,
              scoringMethod
            );
            
            earnedPoints = scoreResult.earnedPoints;
            isCorrect = scoreResult.isCorrect;
            isPartial = scoreResult.isPartial;
            
            const visibleResults = testResults.filter((_: unknown, idx: number) => 
              !question.coding!.testCases[idx]?.isHidden
            );
            const hiddenResults = testResults.filter((_: unknown, idx: number) => 
              question.coding!.testCases[idx]?.isHidden
            );
            
            codingResults = {
              passedTests: testResults.filter((r: { passed: boolean }) => r.passed).length,
              totalTests: testResults.length,
              visibleTests: {
                passed: visibleResults.filter((r: { passed: boolean }) => r.passed).length,
                total: visibleResults.length,
              },
              hiddenTests: {
                passed: hiddenResults.filter((r: { passed: boolean }) => r.passed).length,
                total: hiddenResults.length,
              },
              earnedPoints,
              maxPoints: question.points,
              scoringMethod,
              testResults: testResults.map((r: { 
                passed: boolean; 
                input: string;
                expectedOutput: string;
                actualOutput?: string; 
                error?: string; 
                executionTime?: number;
                isHidden: boolean;
              }, index: number) => ({
                testCaseId: question.coding!.testCases[index]?.id || `test-${index}`,
                passed: r.passed,
                input: r.input,
                expectedOutput: r.expectedOutput,
                actualOutput: r.actualOutput,
                error: r.error,
                executionTime: r.executionTime,
                isHidden: r.isHidden,
                weight: question.coding!.testCases[index]?.weight || 1,
              })),
            };
          } else {
            codingResults = {
              passedTests: 0,
              totalTests: question.coding!.testCases.length,
              visibleTests: {
                passed: 0,
                total: question.coding!.testCases.filter(tc => !tc.isHidden).length,
              },
              hiddenTests: {
                passed: 0,
                total: question.coding!.testCases.filter(tc => tc.isHidden).length,
              },
              earnedPoints: 0,
              maxPoints: question.points,
              scoringMethod: question.coding!.scoringMethod || 'proportional',
              testResults: [],
            };
          }
        } catch (err) {
          console.error('Error executing code for grading:', err);
          processedCount++;
          setGradingProgress({ current: processedCount, total: totalCodingQuestions });
        }

        return { question, isCorrect, isPartial, earnedPoints, codingResults, userAnswer };
      };

      // Execute ALL coding questions in parallel
      const codingResults = await Promise.all(
        codingQuestions.map(q => gradeCodingQuestion(q))
      );

      // Process results
      for (const result of codingResults) {
        const { question, isCorrect, isPartial, earnedPoints, codingResults: cResults, userAnswer } = result;

        if (!answers.get(question.id) || !userAnswer.trim()) {
          unansweredCount++;
        } else if (isCorrect) {
          correctCount++;
          byType['coding'].correct += 1;
        } else if (isPartial) {
          partialCreditCount++;
          byType['coding'].partial = (byType['coding'].partial || 0) + 1;
        } else {
          incorrectCount++;
        }

        byType['coding'].points += earnedPoints;
        totalEarned += earnedPoints;

        resultsMap.set(question.id, {
          questionId: question.id,
          isCorrect,
          earnedPoints,
          maxPoints: question.points,
          userAnswer,
          correctAnswer: question.correctAnswer,
          codingResults: cResults,
        });
      }
    }

    // Build final questionResults in original question order
    for (const question of exam.questions) {
      const result = resultsMap.get(question.id);
      if (result) {
        questionResults.push(result);
      }
    }

    const percentage = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;
    
    // Calculate duration based on currentTimeLeftRef for accuracy (especially after restore)
    // currentTimeLeftRef.current is in seconds, convert to minutes used
    const examDurationMins = exam.duration || 60;
    const timeLeftSeconds = currentTimeLeftRef.current || 0;
    const timeLeftMins = Math.floor(timeLeftSeconds / 60);
    const durationMins = Math.max(1, Math.min(examDurationMins, examDurationMins - timeLeftMins));

    return {
      examId: exam.id,
      examTitle: exam.title,
      subject: exam.subject,
      submittedAt: new Date(),
      duration: durationMins,
      totalPoints,
      earnedPoints: totalEarned,
      percentage,
      grade: calculateGrade(percentage),
      questionResults,
      violationStats: {
        tabSwitchCount: violationStatsRef.current.tabSwitchCount,
        fullscreenExitCount: violationStatsRef.current.fullscreenExitCount,
      },
      statistics: {
        totalQuestions: exam.totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unanswered: unansweredCount,
        partialCredit: partialCreditCount,
        byType,
      },
    };
  }, [exam, answers]);

  const saveResultToDatabase = async (result: ExamResult) => {
    if (!user) {
      console.warn('User not logged in, results will not be saved to database');
      return;
    }

    try {
      // Include violationStats in the statistics object for database storage
      const statisticsWithViolations = {
        ...result.statistics,
        violationStats: result.violationStats,
      };

      // Use upsert to prevent duplicate constraint errors
      // If a result already exists for this user+exam, it will be updated
      const { error: insertError } = await supabase
        .from('exam_results')
        .upsert([{
          user_id: user.id,
          exam_id: result.examId,
          total_points: result.totalPoints,
          earned_points: result.earnedPoints,
          percentage: result.percentage,
          grade: result.grade,
          duration: result.duration,
          question_results: JSON.parse(JSON.stringify(result.questionResults)),
          statistics: JSON.parse(JSON.stringify(statisticsWithViolations)),
        }], {
          onConflict: 'user_id,exam_id',
          ignoreDuplicates: false, // Update if exists
        });

      if (insertError) throw insertError;
      console.log('Exam result saved successfully');
    } catch (err) {
      console.error('Error saving exam result:', err);
      toast.error('Lỗi khi lưu kết quả thi');
    }
  };

  const handleTimeUp = useCallback(async () => {
    if (!exam || !user) return;
    
    toast.error('Hết thời gian làm bài!', {
      description: 'Bài thi của bạn sẽ được nộp tự động.',
    });
    
    // Check if exam has many coding questions - use background grading
    const codingQuestions = exam.questions.filter(q => q.type === 'coding');
    const BACKGROUND_GRADING_THRESHOLD = 2;
    
    if (codingQuestions.length >= BACKGROUND_GRADING_THRESHOLD) {
      setIsSubmitting(true);
      setShowBackgroundGradingUI(true);
      exitFullscreen();
      
      const answersObject: Record<string, string | string[]> = {};
      answers.forEach((answer, questionId) => {
        answersObject[questionId.toString()] = answer.answer;
      });
      
      const questionsForGrading = exam.questions.map(q => ({
        id: q.id,
        type: q.type,
        points: q.points,
        correctAnswer: q.correctAnswer,
        testCases: q.coding?.testCases || [],
        language: q.coding?.defaultLanguage || q.coding?.languages?.[0] || 'python',
        scoringMethod: q.coding?.scoringMethod || 'proportional',
        coding: q.coding,
      }));
      
      try {
        await startBackgroundGrading(
          user.id,
          exam.id,
          answersObject,
          questionsForGrading,
          0, // no time left
          exam.duration
        );
      } catch (err) {
        console.error('Background grading failed on time up:', err);
        // Fallback to regular grading
        const result = await calculateResults();
        if (result) {
          await saveResultToDatabase(result);
          await clearDraft();
          navigate(`/exam/${exam.id}/result`, {
            state: { result, questions: exam.questions },
          });
        }
        setIsSubmitting(false);
        setShowBackgroundGradingUI(false);
      }
    } else {
      exitFullscreen();
      const result = await calculateResults();
      if (result) {
        await saveResultToDatabase(result);
        await clearDraft();
        setTimeout(() => {
          navigate(`/exam/${exam.id}/result`, {
            state: { result, questions: exam.questions },
          });
        }, 2000);
      }
    }
  }, [navigate, exam, user, calculateResults, answers, startBackgroundGrading, clearDraft, exitFullscreen]);

  const { formattedTime, isWarning, isCritical, timeLeft } = useExamTimer({
    initialMinutes: exam?.duration || 60,
    onTimeUp: handleTimeUp,
    isEnabled: examStarted && !isSubmitting && !!exam && !exam.isSectioned,
    savedTimeLeft: savedTimeLeft,
  });

  // Sectioned timer - handle section time up
  const handleSectionTimeUp = useCallback(() => {
    if (!exam?.isSectioned) return;
    setIsSectionTimeUp(true);
    setShowSectionTransitionDialog(true);
  }, [exam?.isSectioned]);

  const sectionedTimer = useSectionedTimer({
    sections: exam?.sections || [],
    currentSectionIndex: currentSection,
    onSectionTimeUp: handleSectionTimeUp,
    savedSectionTimes: Object.keys(sectionTimes).length > 0 ? sectionTimes : undefined,
    isEnabled: examStarted && !isSubmitting && !!exam?.isSectioned,
  });

  // Update ref with current time for auto-save
  useEffect(() => {
    if (!exam?.isSectioned) {
      currentTimeLeftRef.current = timeLeft;
    }
  }, [timeLeft, exam?.isSectioned]);

  // Update sectionTimes for auto-save
  useEffect(() => {
    if (exam?.isSectioned && Object.keys(sectionedTimer.allSectionTimes).length > 0) {
      setSectionTimes(sectionedTimer.allSectionTimes);
    }
  }, [exam?.isSectioned, sectionedTimer.allSectionTimes]);

  // Handle section completion (manual or automatic)
  const handleCompleteSection = useCallback(() => {
    if (!exam?.isSectioned || !exam.sections) return;
    setIsSectionTimeUp(false);
    setShowSectionTransitionDialog(false);
    
    // Mark current section as completed
    setCompletedSections(prev => new Set([...prev, currentSection]));
    
    if (currentSection < exam.sections.length - 1) {
      // Move to next section
      const nextSection = exam.sections[currentSection + 1];
      setCurrentSection(currentSection + 1);
      // Move to first question of next section
      const firstQuestionId = nextSection.questionIds[0];
      const questionIndex = exam.questions.findIndex(q => q.id === firstQuestionId);
      if (questionIndex !== -1) {
        setCurrentQuestion(questionIndex);
      }
      toast.success(`Bắt đầu ${nextSection.name}`);
    } else {
      // Last section - trigger submit dialog
      setShowSubmitDialog(true);
    }
  }, [exam, currentSection]);

  const handleShowSectionDialog = useCallback(() => {
    setIsSectionTimeUp(false);
    setShowSectionTransitionDialog(true);
  }, []);

  // Calculate question statuses
  const questionStatuses: QuestionStatus[] = exam?.questions.map((q) => {
    if (flaggedQuestions.has(q.id)) return 'flagged';
    if (answers.has(q.id)) return 'answered';
    return 'unanswered';
  }) || [];

  // For sectioned exams: map questionId -> status
  const questionStatusMap = useMemo(() => {
    const map = new Map<number, QuestionStatus>();
    exam?.questions.forEach((q, idx) => {
      map.set(q.id, questionStatuses[idx]);
    });
    return map;
  }, [exam?.questions, questionStatuses]);

  // Current question index within current section (for sectioned exams)
  const currentQuestionInSection = useMemo(() => {
    if (!exam?.isSectioned || !exam.sections) return 0;
    const section = exam.sections[currentSection];
    if (!section) return 0;
    const currentQ = exam.questions[currentQuestion];
    return section.questionIds.indexOf(currentQ?.id || 0);
  }, [exam, currentSection, currentQuestion]);

  const handleAnswer = (answer: Answer) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      newAnswers.set(answer.questionId, answer);
      return newAnswers;
    });
  };

  const handleToggleFlag = (questionIndex: number) => {
    if (!exam) return;
    const questionId = exam.questions[questionIndex].id;
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleToggleFlagById = useCallback((questionId: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const handleNavigate = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const handleNavigateById = useCallback((questionId: number) => {
    if (!exam) return;
    
    // For sectioned exams, check if question is in completed section
    if (exam.isSectioned && exam.sections) {
      const sectionIndex = exam.sections.findIndex(s => s.questionIds.includes(questionId));
      if (completedSections.has(sectionIndex)) {
        toast.warning('Không thể quay lại phần đã hoàn thành');
        return;
      }
      if (sectionIndex > currentSection) {
        toast.warning('Chưa thể chuyển đến phần tiếp theo');
        return;
      }
    }
    
    const questionIndex = exam.questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      setCurrentQuestion(questionIndex);
    }
  }, [exam, completedSections, currentSection]);

  // Navigation handlers that respect section boundaries
  const handlePrevious = useCallback(() => {
    if (!exam) return;
    
    if (exam.isSectioned && exam.sections) {
      const currentSectionData = exam.sections[currentSection];
      if (!currentSectionData) return;
      
      const currentQ = exam.questions[currentQuestion];
      const currentIndexInSection = currentSectionData.questionIds.indexOf(currentQ?.id || 0);
      
      if (currentIndexInSection > 0) {
        // Move to previous question in same section
        const prevQuestionId = currentSectionData.questionIds[currentIndexInSection - 1];
        const prevIndex = exam.questions.findIndex(q => q.id === prevQuestionId);
        if (prevIndex !== -1) {
          setCurrentQuestion(prevIndex);
        }
      }
      // If at first question of section, don't go back (section boundary)
    } else {
      setCurrentQuestion(prev => Math.max(0, prev - 1));
    }
  }, [exam, currentSection, currentQuestion]);

  const handleNext = useCallback(() => {
    if (!exam) return;
    
    if (exam.isSectioned && exam.sections) {
      const currentSectionData = exam.sections[currentSection];
      if (!currentSectionData) return;
      
      const currentQ = exam.questions[currentQuestion];
      const currentIndexInSection = currentSectionData.questionIds.indexOf(currentQ?.id || 0);
      
      if (currentIndexInSection < currentSectionData.questionIds.length - 1) {
        // Move to next question in same section
        const nextQuestionId = currentSectionData.questionIds[currentIndexInSection + 1];
        const nextIndex = exam.questions.findIndex(q => q.id === nextQuestionId);
        if (nextIndex !== -1) {
          setCurrentQuestion(nextIndex);
        }
      }
      // If at last question of section, don't go forward (section boundary)
    } else {
      setCurrentQuestion(prev => Math.min(exam.totalQuestions - 1, prev + 1));
    }
  }, [exam, currentSection, currentQuestion]);

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!exam || !user) return;
    
    setIsSubmitting(true);
    setShowSubmitDialog(false);
    
    // Exit fullscreen before navigating
    exitFullscreen();
    
    try {
      // Count coding questions
      const codingQuestions = exam.questions.filter(q => q.type === 'coding');
      const BACKGROUND_GRADING_THRESHOLD = 2; // Use background grading if >= 2 coding questions
      
      if (codingQuestions.length >= BACKGROUND_GRADING_THRESHOLD) {
        // Use background grading for exams with many coding questions
        setShowBackgroundGradingUI(true);
        
        // Convert answers to plain object
        const answersObject: Record<string, string | string[]> = {};
        answers.forEach((answer, questionId) => {
          answersObject[questionId.toString()] = answer.answer;
        });
        
        // Transform questions for edge function - include all necessary coding info
        const questionsForGrading = exam.questions.map(q => ({
          id: q.id,
          type: q.type,
          points: q.points,
          correctAnswer: q.correctAnswer,
          testCases: q.coding?.testCases || [],
          language: q.coding?.defaultLanguage || q.coding?.languages?.[0] || 'python',
          scoringMethod: q.coding?.scoringMethod || 'proportional',
          coding: q.coding, // Pass full coding config for weighted scoring
        }));
        
        await startBackgroundGrading(
          user.id,
          exam.id,
          answersObject,
          questionsForGrading,
          currentTimeLeftRef.current || 0, // timeLeft in seconds
          exam.duration // examDuration in minutes
        );
        
        toast.info('Đang chấm bài...', {
          description: 'Bạn sẽ được thông báo khi hoàn thành.',
        });
      } else {
        // Use regular grading for exams without many coding questions
        const result = await calculateResults();
        
        if (result) {
          await saveResultToDatabase(result);
          
          // Clear draft after successful submission
          await clearDraft();
          
          toast.success('Nộp bài thành công!', {
            description: `Bạn đã trả lời ${answers.size}/${exam.totalQuestions} câu hỏi.`,
          });
          
          navigate(`/exam/${exam.id}/result`, {
            state: { result, questions: exam.questions },
          });
        }
        setIsSubmitting(false);
        setGradingProgress(null);
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      toast.error('Lỗi khi nộp bài. Vui lòng thử lại.');
      setIsSubmitting(false);
      setGradingProgress(null);
      setShowBackgroundGradingUI(false);
    }
  };

  // Start exam and enter fullscreen
  const handleStartExam = async () => {
    await enterFullscreen();
    setExamStarted(true);
    startTimeRef.current = Date.now();
  };

  // Background grading UI
  if (showBackgroundGradingUI && gradingJob) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Đang chấm bài...
          </h1>
          <p className="text-muted-foreground mb-6">
            Hệ thống đang chấm các câu coding. Bạn có thể đợi ở đây hoặc rời đi - kết quả sẽ được lưu tự động.
          </p>
          
          <div className="bg-card border rounded-lg p-6 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tiến trình</span>
              <span className="font-medium">{gradingJob.gradedQuestions}/{gradingJob.totalQuestions} câu</span>
            </div>
            <Progress value={gradingJob.progress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">
              {gradingJob.status === 'pending' && 'Đang khởi tạo...'}
              {gradingJob.status === 'processing' && `Đã chấm ${gradingJob.progress}%`}
              {gradingJob.status === 'completed' && 'Hoàn thành!'}
              {gradingJob.status === 'failed' && 'Lỗi khi chấm bài'}
            </p>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate('/my-exams')}
          >
            Về danh sách bài thi
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (authLoading || isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải bài thi...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {error || 'Không tìm thấy bài thi'}
          </h1>
          <p className="text-muted-foreground mb-6">
            Vui lòng kiểm tra lại đường dẫn hoặc liên hệ giáo viên.
          </p>
          <Button onClick={() => navigate('/')} variant="hero">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Auth check - require login for taking exams
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Yêu cầu đăng nhập
          </h1>
          <p className="text-muted-foreground mb-6">
            Bạn cần đăng nhập để làm bài thi này.
          </p>
          <Button onClick={() => navigate('/auth')} variant="hero">
            Đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestion];

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Bài thi không có câu hỏi nào.</p>
          <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  // Show start exam screen if exam not started yet
  if (!examStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Maximize className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{exam.title}</h1>
          <p className="text-muted-foreground mb-6">{exam.subject}</p>
          
          <div className="bg-card border border-border rounded-lg p-6 mb-6 text-left">
            <h2 className="font-semibold text-foreground mb-4">Lưu ý trước khi làm bài:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Bài thi sẽ được thực hiện ở chế độ toàn màn hình
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Hệ thống sẽ ghi lại nếu bạn chuyển tab hoặc thoát toàn màn hình
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Thời gian làm bài: {exam.duration} phút
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                Số câu hỏi: {exam.totalQuestions} câu
              </li>
            </ul>
          </div>

          <Button onClick={handleStartExam} variant="hero" size="lg" className="gap-2">
            <Maximize className="w-5 h-5" />
            Bắt đầu làm bài
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Violation Warning Overlay */}
      {showViolationWarning && !isFullscreen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-destructive/50 rounded-xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Cảnh báo vi phạm!</h2>
            <p className="text-muted-foreground mb-4">
              Bạn đã thoát khỏi chế độ toàn màn hình. Hành vi này đã được ghi lại.
            </p>
            <div className="bg-destructive/10 rounded-lg p-4 mb-6 text-sm">
              <p className="text-foreground">
                Số lần chuyển tab: <strong>{violationStatsRef.current.tabSwitchCount}</strong>
              </p>
              <p className="text-foreground">
                Số lần thoát toàn màn hình: <strong>{violationStatsRef.current.fullscreenExitCount}</strong>
              </p>
            </div>
            <Button 
              onClick={() => {
                enterFullscreen();
                setShowViolationWarning(false);
              }} 
              variant="hero" 
              className="gap-2"
            >
              <Maximize className="w-4 h-4" />
              Quay lại chế độ toàn màn hình
            </Button>
          </div>
        </div>
      )}

      {/* Submitting Overlay with Grading Progress */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Đang nộp bài...</h2>
            {gradingProgress && gradingProgress.total > 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Đang chấm câu lập trình {gradingProgress.current}/{gradingProgress.total}
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(gradingProgress.current / gradingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Vui lòng chờ trong giây lát...</p>
            )}
          </div>
        </div>
      )}

      {/* Violation Stats Badge - Descriptive labels for each type */}
      {(violationStatsRef.current.tabSwitchCount > 0 || violationStatsRef.current.fullscreenExitCount > 0) && (
        <div className="fixed top-20 right-4 z-40">
          <div className="flex flex-col gap-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg py-2 px-3 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold">Vi phạm quy định thi</span>
            </div>
            <div className="flex items-center gap-3 text-destructive/80">
              <span>Chuyển tab: {violationStatsRef.current.tabSwitchCount}</span>
              <span>Thoát toàn màn hình: {violationStatsRef.current.fullscreenExitCount}</span>
            </div>
          </div>
        </div>
      )}

      <ExamHeader
        title={exam.title}
        subject={exam.subject}
        formattedTime={exam.isSectioned ? sectionedTimer.formattedSectionTime : formattedTime}
        isWarning={exam.isSectioned ? sectionedTimer.isWarning : isWarning}
        isCritical={exam.isSectioned ? sectionedTimer.isCritical : isCritical}
        onSubmit={handleSubmit}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        sectionName={exam.isSectioned ? exam.sections?.[currentSection]?.name : undefined}
        sectionProgress={exam.isSectioned ? sectionedTimer.sectionProgress : undefined}
        answeredCount={questionStatuses.filter(s => s === 'answered').length}
        totalQuestions={exam.totalQuestions}
      />

      {exam.isSectioned && exam.sections ? (
        <SectionedQuestionNavigation
          sections={exam.sections}
          currentSectionIndex={currentSection}
          completedSections={completedSections}
          currentQuestionInSection={currentQuestionInSection}
          questionStatuses={questionStatusMap}
          formattedTime={sectionedTimer.formattedSectionTime}
          isWarning={sectionedTimer.isWarning}
          isCritical={sectionedTimer.isCritical}
          onNavigate={handleNavigateById}
          onToggleFlag={handleToggleFlagById}
          onCompleteSection={handleShowSectionDialog}
        />
      ) : (
        <QuestionNavigation
          totalQuestions={exam.totalQuestions}
          currentQuestion={currentQuestion}
          questionStatuses={questionStatuses}
          onNavigate={handleNavigate}
          onToggleFlag={handleToggleFlag}
        />
      )}

      <QuestionDisplay
        question={currentQ}
        questionIndex={exam.isSectioned ? currentQuestionInSection : currentQuestion}
        totalQuestions={exam.isSectioned ? (exam.sections?.[currentSection]?.questionIds.length || exam.totalQuestions) : exam.totalQuestions}
        status={questionStatuses[currentQuestion]}
        currentAnswer={answers.get(currentQ.id)}
        onAnswer={handleAnswer}
        onToggleFlag={() => handleToggleFlag(currentQuestion)}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleConfirmSubmit}
        questionStatuses={questionStatuses}
        formattedTime={exam.isSectioned ? sectionedTimer.formattedSectionTime : formattedTime}
      />

      {/* Section Transition Dialog */}
      {exam.isSectioned && exam.sections && (
        <SectionTransitionDialog
          open={showSectionTransitionDialog}
          currentSection={exam.sections[currentSection]}
          nextSection={exam.sections[currentSection + 1] || null}
          answeredInSection={exam.sections[currentSection]?.questionIds.filter(id => answers.has(id)).length || 0}
          totalInSection={exam.sections[currentSection]?.questionIds.length || 0}
          isTimeUp={isSectionTimeUp}
          onConfirm={handleCompleteSection}
          onCancel={isSectionTimeUp ? undefined : () => setShowSectionTransitionDialog(false)}
        />
      )}

      {/* Restore Draft Dialog - Auto-continue, no retake option */}
      <AlertDialog open={showRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Tiếp tục bài làm
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phát hiện bài làm chưa nộp từ phiên trước. Bạn sẽ tiếp tục từ nơi đã dừng lại.
              {draftData && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Đã trả lời:</strong> {Object.keys(draftData.answers).length} câu</p>
                  <p><strong>Lần lưu cuối:</strong> {new Date(draftData.savedAt).toLocaleString('vi-VN')}</p>
                  {draftData.timeLeft && draftData.timeLeft > 0 && (
                    <p><strong>Thời gian còn lại:</strong> {Math.floor(draftData.timeLeft / 60)} phút {draftData.timeLeft % 60} giây</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleRestoreDraft} className="gap-2 w-full">
              <RotateCcw className="w-4 h-4" />
              Tiếp tục làm bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeExam;
