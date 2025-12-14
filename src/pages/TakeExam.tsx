import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ExamHeader } from '@/components/exam/ExamHeader';
import { QuestionNavigation } from '@/components/exam/QuestionNavigation';
import { QuestionDisplay } from '@/components/exam/QuestionDisplay';
import { SubmitDialog } from '@/components/exam/SubmitDialog';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useExamAutoSave } from '@/hooks/useExamAutoSave';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExamData, Question, Answer, QuestionStatus, ExamResult, QuestionResult, QuestionType, ViolationStats } from '@/types/exam';
import { Loader2, Maximize, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const startTimeRef = useRef(Date.now());
  
  // Fullscreen and violation tracking
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const violationStatsRef = useRef<ViolationStats>({ tabSwitchCount: 0, fullscreenExitCount: 0 });
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Auto-save hook
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

    // Restore answers
    const restoredAnswers = new Map<number, Answer>();
    Object.entries(draftData.answers).forEach(([key, value]) => {
      restoredAnswers.set(Number(key), value);
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

    restoreFromDraft();
    setShowRestoreDialog(false);
  }, [draftData, restoreFromDraft]);

  // Handle dismiss draft
  const handleDismissDraft = useCallback(() => {
    dismissDraft();
    setShowRestoreDialog(false);
  }, [dismissDraft]);

  // Fullscreen management
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
    
    // Count coding questions for progress tracking
    const codingQuestions = exam.questions.filter(q => q.type === 'coding');
    const totalCodingQuestions = codingQuestions.length;
    let processedCodingQuestions = 0;
    
    if (totalCodingQuestions > 0) {
      setGradingProgress({ current: 0, total: totalCodingQuestions });
    }
    
    const byType: Record<QuestionType, { correct: number; total: number; points: number; partial: number }> = {
      'multiple-choice': { correct: 0, total: 0, points: 0, partial: 0 },
      'short-answer': { correct: 0, total: 0, points: 0, partial: 0 },
      'essay': { correct: 0, total: 0, points: 0, partial: 0 },
      'drag-drop': { correct: 0, total: 0, points: 0, partial: 0 },
      'coding': { correct: 0, total: 0, points: 0, partial: 0 },
    };

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let partialCreditCount = 0;

    for (const question of exam.questions) {
      const answer = answers.get(question.id);
      const userAnswer = answer?.answer || '';
      let isCorrect = false;
      let isPartial = false;
      let earnedPoints = 0;
      let codingResults: QuestionResult['codingResults'] = undefined;

      byType[question.type].total += 1;

      if (!answer || (typeof userAnswer === 'string' && !userAnswer.trim())) {
        unansweredCount++;
      } else {
        if (question.type === 'multiple-choice') {
          isCorrect = userAnswer === question.correctAnswer;
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'short-answer') {
          const normalizedUser = String(userAnswer).toLowerCase().trim().replace(/\s+/g, '');
          const normalizedCorrect = String(question.correctAnswer || '').toLowerCase().trim().replace(/\s+/g, '');
          isCorrect = normalizedUser === normalizedCorrect;
          earnedPoints = isCorrect ? question.points : 0;
        } else if (question.type === 'essay') {
          // Essay gets partial credit based on content
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
        } else if (question.type === 'coding' && question.coding) {
          // Execute code with ALL test cases (including hidden) for grading
          try {
            processedCodingQuestions++;
            setGradingProgress({ current: processedCodingQuestions, total: totalCodingQuestions });
            
            const { data, error } = await supabase.functions.invoke('execute-code', {
              body: {
                code: userAnswer,
                language: answer.language || question.coding.defaultLanguage,
                testCases: question.coding.testCases.map((tc) => ({
                  input: tc.input,
                  expectedOutput: tc.expectedOutput,
                  isHidden: tc.isHidden,
                  weight: tc.weight || 1,
                })),
                timeLimit: question.coding.timeLimit || 5,
                memoryLimit: question.coding.memoryLimit || 256,
                includeHidden: true, // Include hidden tests for final grading
              },
            });

            if (!error && data?.success) {
              const testResults = data.results;
              const scoringMethod = question.coding.scoringMethod || 'proportional';
              
              // Calculate score
              const scoreResult = calculateCodingScore(
                testResults.map((r: { passed: boolean }, idx: number) => ({
                  passed: r.passed,
                  isHidden: question.coding!.testCases[idx]?.isHidden || false
                })),
                question.coding.testCases,
                question.points,
                scoringMethod
              );
              
              earnedPoints = scoreResult.earnedPoints;
              isCorrect = scoreResult.isCorrect;
              isPartial = scoreResult.isPartial;
              
              // Count visible and hidden test results
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
              // If execution fails, give 0 points
              earnedPoints = 0;
              isCorrect = false;
              codingResults = {
                passedTests: 0,
                totalTests: question.coding.testCases.length,
                visibleTests: {
                  passed: 0,
                  total: question.coding.testCases.filter(tc => !tc.isHidden).length,
                },
                hiddenTests: {
                  passed: 0,
                  total: question.coding.testCases.filter(tc => tc.isHidden).length,
                },
                earnedPoints: 0,
                maxPoints: question.points,
                scoringMethod: question.coding.scoringMethod || 'proportional',
                testResults: [],
              };
            }
          } catch (err) {
            console.error('Error executing code for grading:', err);
            earnedPoints = 0;
            isCorrect = false;
          }
        }

        // Update counters
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

      questionResults.push({
        questionId: question.id,
        isCorrect,
        earnedPoints,
        maxPoints: question.points,
        userAnswer,
        correctAnswer: question.correctAnswer,
        codingResults,
      });
    }

    const percentage = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;
    const durationMs = Date.now() - startTimeRef.current;
    const durationMins = Math.ceil(durationMs / 60000);

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

      const { error: insertError } = await supabase
        .from('exam_results')
        .insert([{
          user_id: user.id,
          exam_id: result.examId,
          total_points: result.totalPoints,
          earned_points: result.earnedPoints,
          percentage: result.percentage,
          grade: result.grade,
          duration: result.duration,
          question_results: JSON.parse(JSON.stringify(result.questionResults)),
          statistics: JSON.parse(JSON.stringify(statisticsWithViolations)),
        }]);

      if (insertError) throw insertError;
      console.log('Exam result saved successfully');
    } catch (err) {
      console.error('Error saving exam result:', err);
      toast.error('Lỗi khi lưu kết quả thi');
    }
  };

  const handleTimeUp = useCallback(async () => {
    if (!exam) return;
    
    toast.error('Hết thời gian làm bài!', {
      description: 'Bài thi của bạn sẽ được nộp tự động.',
    });
    
    const result = await calculateResults();
    if (result) {
      await saveResultToDatabase(result);
      setTimeout(() => {
        navigate(`/exam/${exam.id}/result`, {
          state: { result, questions: exam.questions },
        });
      }, 2000);
    }
  }, [navigate, exam, calculateResults]);

  const { formattedTime, isWarning, isCritical } = useExamTimer({
    initialMinutes: exam?.duration || 60,
    onTimeUp: handleTimeUp,
  });

  // Calculate question statuses
  const questionStatuses: QuestionStatus[] = exam?.questions.map((q) => {
    if (flaggedQuestions.has(q.id)) return 'flagged';
    if (answers.has(q.id)) return 'answered';
    return 'unanswered';
  }) || [];

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

  const handleNavigate = (questionIndex: number) => {
    setCurrentQuestion(questionIndex);
  };

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!exam) return;
    
    setIsSubmitting(true);
    setShowSubmitDialog(false);
    
    // Exit fullscreen before navigating
    exitFullscreen();
    
    try {
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
    } catch (err) {
      console.error('Error submitting exam:', err);
      toast.error('Lỗi khi nộp bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
      setGradingProgress(null);
    }
  };

  // Start exam and enter fullscreen
  const handleStartExam = async () => {
    await enterFullscreen();
    setExamStarted(true);
    startTimeRef.current = Date.now();
  };

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

      {/* Violation Stats Badge */}
      {(violationStatsRef.current.tabSwitchCount > 0 || violationStatsRef.current.fullscreenExitCount > 0) && (
        <div className="fixed top-20 right-4 z-40">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 py-2 px-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Vi phạm: {violationStatsRef.current.tabSwitchCount + violationStatsRef.current.fullscreenExitCount} lần
            </AlertDescription>
          </Alert>
        </div>
      )}

      <ExamHeader
        title={exam.title}
        subject={exam.subject}
        formattedTime={formattedTime}
        isWarning={isWarning}
        isCritical={isCritical}
        onSubmit={handleSubmit}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
      />

      <QuestionNavigation
        totalQuestions={exam.totalQuestions}
        currentQuestion={currentQuestion}
        questionStatuses={questionStatuses}
        onNavigate={handleNavigate}
        onToggleFlag={handleToggleFlag}
      />

      <QuestionDisplay
        question={currentQ}
        questionIndex={currentQuestion}
        totalQuestions={exam.totalQuestions}
        status={questionStatuses[currentQuestion]}
        currentAnswer={answers.get(currentQ.id)}
        onAnswer={handleAnswer}
        onToggleFlag={() => handleToggleFlag(currentQuestion)}
        onPrevious={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
        onNext={() => setCurrentQuestion((prev) => Math.min(exam.totalQuestions - 1, prev + 1))}
      />

      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleConfirmSubmit}
        questionStatuses={questionStatuses}
        formattedTime={formattedTime}
      />

      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Khôi phục bài làm trước đó?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phát hiện bài làm chưa nộp từ phiên trước. Bạn có muốn tiếp tục từ nơi đã dừng lại không?
              {draftData && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Đã trả lời:</strong> {Object.keys(draftData.answers).length} câu</p>
                  <p><strong>Lần lưu cuối:</strong> {new Date(draftData.savedAt).toLocaleString('vi-VN')}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissDraft} className="gap-2">
              <X className="w-4 h-4" />
              Bắt đầu mới
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Khôi phục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TakeExam;
