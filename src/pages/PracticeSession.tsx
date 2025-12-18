import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  useSkillProfile,
  useSkillMasteries,
  useCreatePracticeSession,
  useCompletePracticeSession,
  useUpdateSkillProfile,
  useUpsertSkillMastery,
  calculateXP
} from '@/hooks/usePractice';
import {
  selectAdaptiveQuestions,
  updateQuestionHistory,
  getBaseDifficulty,
  calculateWeightedMastery
} from '@/hooks/useAdaptiveQuestionSelection';
import { useDailyChallengeProgress } from '@/hooks/useDailyChallengeProgress';
import { useAchievementChecker } from '@/hooks/useAchievementChecker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ChevronRight, 
  Star,
  CheckCircle,
  XCircle,
  Lightbulb,
  X,
  TrendingUp,
  TrendingDown,
  Trophy,
  Award
} from 'lucide-react';
import { SESSION_TYPES, SessionType, PracticeQuestionResult, DailyChallenge, Achievement } from '@/types/practice';
import { cn } from '@/lib/utils';

interface PracticeQuestion {
  id: string;
  content: string;
  question_type: string;
  answer_data: any;
  difficulty: number;
  taxonomy_node_id: string;
  explanation?: string;
  hints?: string[];
  estimated_time?: number;
}

export default function PracticeSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionType = (searchParams.get('type') as SessionType) || 'daily_practice';
  const subjectId = searchParams.get('subject') || undefined;
  
  const { user } = useAuth();
  const { data: profile } = useSkillProfile();
  const { data: masteries } = useSkillMasteries(subjectId);
  const createSession = useCreatePracticeSession();
  const completeSession = useCompletePracticeSession();
  const updateProfile = useUpdateSkillProfile();
  const upsertMastery = useUpsertSkillMastery();
  const { processSessionForChallenges, updateStreakChallenge } = useDailyChallengeProgress();
  const { checkAchievements } = useAchievementChecker();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, PracticeQuestionResult>>({});
  const [showResult, setShowResult] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<DailyChallenge[]>([]);
  const [challengeBonusXP, setChallengeBonusXP] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [achievementXP, setAchievementXP] = useState(0);
  
  // Adaptive difficulty tracking
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveIncorrect, setConsecutiveIncorrect] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(3);
  const [difficultyTrend, setDifficultyTrend] = useState<'up' | 'down' | null>(null);
  const loadedRef = useRef(false);

  const sessionConfig = SESSION_TYPES[sessionType];
  const currentQuestion = questions[currentIndex];

  // Load questions based on session type
  useEffect(() => {
    loadQuestions();
  }, [sessionType, subjectId, masteries]);

  const loadQuestions = async () => {
    if (!user?.id || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);

    try {
      // Get published questions
      let query = supabase
        .from('questions')
        .select('id, content, question_type, answer_data, difficulty, taxonomy_node_id, explanation, hints, estimated_time')
        .eq('status', 'published')
        .is('deleted_at', null);

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data: allQuestions, error } = await query.limit(200);
      if (error) throw error;

      if (!allQuestions || allQuestions.length === 0) {
        toast.error('Không có câu hỏi nào để luyện tập');
        navigate('/practice');
        return;
      }

      // Cast to our type
      const typedQuestions = allQuestions as unknown as PracticeQuestion[];

      // Get base difficulty from student level
      const baseDifficulty = getBaseDifficulty(profile?.current_level || 1);
      setCurrentDifficulty(baseDifficulty);

      // Use adaptive selection algorithm
      const selectedQuestions = await selectAdaptiveQuestions(
        typedQuestions,
        10,
        {
          userId: user.id,
          sessionType,
          subjectId,
          masteries: masteries || [],
          targetDifficulty: baseDifficulty,
          consecutiveCorrect: 0,
          consecutiveIncorrect: 0
        }
      );
      
      setQuestions(selectedQuestions);

      // Create session
      const session = await createSession.mutateAsync({
        session_type: sessionType,
        subject_id: subjectId || null,
        questions_count: selectedQuestions.length
      });
      setSessionId(session.id);

    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Không thể tải câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string | string[]) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
  };

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || !user?.id) return;

    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    setQuestionTimes(prev => ({ ...prev, [currentQuestion.id]: timeSpent }));

    const userAnswer = answers[currentQuestion.id];
    const answerData = currentQuestion.answer_data;
    let isCorrect = false;
    let correctAnswer: string | string[] = '';

    // Check answer based on question type
    if (currentQuestion.question_type === 'MCQ_SINGLE') {
      const correctOption = answerData.options?.find((o: any) => o.isCorrect);
      correctAnswer = correctOption?.id || '';
      isCorrect = userAnswer === correctAnswer;
    } else if (currentQuestion.question_type === 'TRUE_FALSE_4') {
      correctAnswer = answerData.statements?.map((s: any) => s.isTrue ? 'true' : 'false') || [];
      isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    } else if (currentQuestion.question_type === 'SHORT_ANSWER') {
      correctAnswer = answerData.acceptedAnswers || [];
      const userAnswerLower = (userAnswer as string)?.toLowerCase().trim();
      isCorrect = (correctAnswer as string[]).some(a => 
        answerData.caseSensitive ? a.trim() === (userAnswer as string)?.trim() : a.toLowerCase().trim() === userAnswerLower
      );
    }

    // Update consecutive tracking and difficulty
    if (isCorrect) {
      const newConsecutiveCorrect = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutiveCorrect);
      setConsecutiveIncorrect(0);
      
      // Increase difficulty after 3 consecutive correct
      if (newConsecutiveCorrect >= 3 && newConsecutiveCorrect % 3 === 0) {
        const newDifficulty = Math.min(5, currentDifficulty + 1);
        if (newDifficulty > currentDifficulty) {
          setCurrentDifficulty(newDifficulty);
          setDifficultyTrend('up');
          setTimeout(() => setDifficultyTrend(null), 2000);
        }
      }
    } else {
      const newConsecutiveIncorrect = consecutiveIncorrect + 1;
      setConsecutiveIncorrect(newConsecutiveIncorrect);
      setConsecutiveCorrect(0);
      
      // Decrease difficulty after 3 consecutive incorrect
      if (newConsecutiveIncorrect >= 3 && newConsecutiveIncorrect % 3 === 0) {
        const newDifficulty = Math.max(1, currentDifficulty - 1);
        if (newDifficulty < currentDifficulty) {
          setCurrentDifficulty(newDifficulty);
          setDifficultyTrend('down');
          setTimeout(() => setDifficultyTrend(null), 2000);
        }
      }
    }

    // Update question history with SM-2 algorithm
    try {
      await updateQuestionHistory(
        user.id,
        currentQuestion.id,
        isCorrect,
        timeSpent,
        currentQuestion.estimated_time || 60
      );
    } catch (error) {
      console.error('Error updating question history:', error);
    }

    // Calculate XP
    const xpEarned = calculateXP(
      isCorrect, 
      currentQuestion.difficulty || 3, 
      false, 
      timeSpent, 
      currentQuestion.estimated_time || 60
    ) * sessionConfig.xpMultiplier;

    setTotalXP(prev => prev + xpEarned);

    const result: PracticeQuestionResult = {
      questionId: currentQuestion.id,
      userAnswer: userAnswer || '',
      correctAnswer,
      isCorrect,
      earnedPoints: isCorrect ? 1 : 0,
      maxPoints: 1,
      timeSpent
    };

    setResults(prev => ({ ...prev, [currentQuestion.id]: result }));
    setShowResult(true);
  }, [currentQuestion, answers, questionStartTime, sessionConfig.xpMultiplier, user?.id, consecutiveCorrect, consecutiveIncorrect, currentDifficulty]);

  const nextQuestion = () => {
    setShowResult(false);
    setShowHint(false);
    setHintIndex(0);
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      completeSessionHandler();
    }
  };

  const completeSessionHandler = async () => {
    if (!sessionId || !profile) return;

    const correctCount = Object.values(results).filter(r => r.isCorrect).length;
    const totalTime = Object.values(questionTimes).reduce((a, b) => a + b, 0);
    const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
    const isPerfect = correctCount === questions.length && questions.length >= 5;

    try {
      // Complete session
      await completeSession.mutateAsync({
        sessionId,
        results: {
          correct_count: correctCount,
          xp_earned: Math.round(totalXP),
          time_spent_seconds: totalTime,
          question_results: Object.values(results)
        }
      });

      // Update profile
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = profile.last_practice_date !== today;
      const newStreak = isNewDay ? profile.current_streak + 1 : profile.current_streak;

      await updateProfile.mutateAsync({
        total_xp: profile.total_xp + Math.round(totalXP),
        total_questions_attempted: profile.total_questions_attempted + questions.length,
        total_correct_answers: profile.total_correct_answers + correctCount,
        total_practice_time_minutes: profile.total_practice_time_minutes + Math.round(totalTime / 60),
        current_streak: newStreak,
        longest_streak: Math.max(profile.longest_streak, newStreak),
        last_practice_date: today
      });

      // Process daily challenges
      const challengeResult = await processSessionForChallenges({
        questionsAnswered: questions.length,
        correctAnswers: correctCount,
        timeSpentMinutes: Math.round(totalTime / 60),
        isPerfectSession: isPerfect
      });

      if (challengeResult.completedChallenges.length > 0) {
        setCompletedChallenges(challengeResult.completedChallenges);
        setChallengeBonusXP(challengeResult.bonusXP);
      }

      // Update streak challenge if new day
      if (isNewDay) {
        await updateStreakChallenge();
      }

      // Update masteries
      for (const q of questions) {
        if (!q.taxonomy_node_id) continue;
        const result = results[q.id];
        if (!result) continue;

        const existingMastery = masteries?.find(m => m.taxonomy_node_id === q.taxonomy_node_id);
        const newAttempted = (existingMastery?.questions_attempted || 0) + 1;
        const newCorrect = (existingMastery?.questions_correct || 0) + (result.isCorrect ? 1 : 0);
        const newMastery = Math.min(100, (newCorrect / newAttempted) * 100);

        await upsertMastery.mutateAsync({
          taxonomy_node_id: q.taxonomy_node_id,
          questions_attempted: newAttempted,
          questions_correct: newCorrect,
          mastery_level: newMastery
        });
      }

      // Check achievements after session
      const achievementResult = await checkAchievements({
        questionsAnswered: questions.length,
        correctAnswers: correctCount,
        isPerfectSession: isPerfect,
        timeOfDay: new Date()
      });

      if (achievementResult.newAchievements.length > 0) {
        setUnlockedAchievements(achievementResult.newAchievements);
        setAchievementXP(achievementResult.totalXPEarned);
        
        // Show toast for each achievement
        achievementResult.newAchievements.forEach(achievement => {
          toast.success(`🏆 Mở khóa: ${achievement.name}`, {
            description: `+${achievement.xp_reward} XP`
          });
        });
      }

      setSessionComplete(true);
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Có lỗi xảy ra khi lưu kết quả');
    }
  };

  const revealHint = () => {
    if (!currentQuestion?.hints?.length) return;
    if (hintIndex < currentQuestion.hints.length) {
      setShowHint(true);
      setHintIndex(prev => prev + 1);
      setTotalXP(prev => Math.max(0, prev - 5)); // Deduct XP for hint
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (sessionComplete) {
    const correctCount = Object.values(results).filter(r => r.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const totalEarnedXP = Math.round(totalXP) + challengeBonusXP + achievementXP;

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="text-6xl mb-4">🎉</div>
            <CardTitle className="text-2xl">Hoàn thành!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Độ chính xác</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-3xl font-bold">{correctCount}/{questions.length}</p>
                <p className="text-sm text-muted-foreground">Câu đúng</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-3xl font-bold text-primary">+{totalEarnedXP}</p>
                <p className="text-sm text-muted-foreground">XP</p>
              </div>
            </div>

            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-4">
                <div className="flex items-center gap-2 justify-center mb-3">
                  <Award className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold">Thành tích mới!</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {unlockedAchievements.map(achievement => (
                    <div 
                      key={achievement.id} 
                      className="flex flex-col items-center gap-1 p-3 bg-white/50 dark:bg-black/20 rounded-lg min-w-[100px]"
                    >
                      <span className="text-3xl">{achievement.icon}</span>
                      <span className="font-medium text-sm">{achievement.name}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          achievement.rarity === 'legendary' && "border-yellow-400 text-yellow-600",
                          achievement.rarity === 'epic' && "border-purple-400 text-purple-600",
                          achievement.rarity === 'rare' && "border-blue-400 text-blue-600"
                        )}
                      >
                        +{achievement.xp_reward} XP
                      </Badge>
                    </div>
                  ))}
                </div>
                {achievementXP > 0 && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-3">
                    Bonus thành tích: +{achievementXP} XP
                  </p>
                )}
              </div>
            )}

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-950/30 dark:to-green-950/30 rounded-lg p-4">
                <div className="flex items-center gap-2 justify-center mb-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">Thử thách hoàn thành!</span>
                </div>
                <div className="space-y-2">
                  {completedChallenges.map(challenge => (
                    <div key={challenge.id} className="flex items-center justify-between text-sm bg-white/50 dark:bg-black/20 rounded-md p-2">
                      <span>{challenge.description}</span>
                      <Badge variant="secondary">+{challenge.xp_reward} XP</Badge>
                    </div>
                  ))}
                </div>
                {challengeBonusXP > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Bonus thử thách: +{challengeBonusXP} XP
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/practice')}>
                Quay lại
              </Button>
              <Button onClick={() => window.location.reload()}>
                Luyện tập tiếp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Không có câu hỏi nào</p>
        <Button onClick={() => navigate('/practice')} className="mt-4">
          Quay lại
        </Button>
      </div>
    );
  }

  const answerData = currentQuestion.answer_data;
  const currentResult = results[currentQuestion.id];

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/practice')}>
          <X className="h-4 w-4 mr-1" /> Thoát
        </Button>
        <div className="flex items-center gap-4">
          {/* Difficulty indicator */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Độ khó:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={cn(
                    "w-2 h-4 rounded-sm transition-colors",
                    level <= currentDifficulty ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            {difficultyTrend === 'up' && (
              <TrendingUp className="h-4 w-4 text-green-500 animate-bounce" />
            )}
            {difficultyTrend === 'down' && (
              <TrendingDown className="h-4 w-4 text-orange-500 animate-bounce" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold">+{Math.round(totalXP)} XP</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Câu {currentIndex + 1}/{questions.length}</span>
          <div className="flex items-center gap-2">
            {consecutiveCorrect >= 2 && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                🔥 {consecutiveCorrect} liên tiếp
              </Badge>
            )}
            <Badge variant="outline">{sessionConfig.name}</Badge>
          </div>
        </div>
        <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {currentQuestion.question_type === 'MCQ_SINGLE' && 'Trắc nghiệm'}
              {currentQuestion.question_type === 'TRUE_FALSE_4' && 'Đúng/Sai'}
              {currentQuestion.question_type === 'SHORT_ANSWER' && 'Tự luận ngắn'}
            </Badge>
            {!showResult && currentQuestion.hints && currentQuestion.hints.length > 0 && (
              <Button variant="ghost" size="sm" onClick={revealHint}>
                <Lightbulb className="h-4 w-4 mr-1" />
                Gợi ý (-5 XP)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question Content */}
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
          />

          {/* Hint */}
          {showHint && currentQuestion.hints && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                💡 {currentQuestion.hints[hintIndex - 1]}
              </p>
            </div>
          )}

          {/* Answer Options */}
          {!showResult ? (
            <>
              {currentQuestion.question_type === 'MCQ_SINGLE' && answerData.options && (
                <RadioGroup
                  value={answers[currentQuestion.id] as string || ''}
                  onValueChange={(value) => handleAnswer(value)}
                >
                  {answerData.options.map((option: any) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        <div dangerouslySetInnerHTML={{ __html: option.text }} />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.question_type === 'TRUE_FALSE_4' && answerData.statements && (
                <div className="space-y-3">
                  {answerData.statements.map((statement: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">{statement.text}</span>
                      <RadioGroup
                        value={(answers[currentQuestion.id] as string[])?.[idx] || ''}
                        onValueChange={(value) => {
                          const current = (answers[currentQuestion.id] as string[]) || new Array(answerData.statements.length).fill('');
                          const updated = [...current];
                          updated[idx] = value;
                          handleAnswer(updated);
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="true" id={`${idx}-true`} />
                          <Label htmlFor={`${idx}-true`}>Đúng</Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="false" id={`${idx}-false`} />
                          <Label htmlFor={`${idx}-false`}>Sai</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'SHORT_ANSWER' && (
                <Textarea
                  placeholder="Nhập câu trả lời của bạn..."
                  value={answers[currentQuestion.id] as string || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  rows={3}
                />
              )}

              <Button 
                className="w-full" 
                onClick={submitAnswer}
                disabled={!answers[currentQuestion.id]}
              >
                Kiểm tra
              </Button>
            </>
          ) : (
            /* Result Display */
            <div className="space-y-4">
              <div className={cn(
                "p-4 rounded-lg flex items-center gap-3",
                currentResult?.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              )}>
                {currentResult?.isCorrect ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className={cn(
                    "font-semibold",
                    currentResult?.isCorrect ? "text-green-700" : "text-red-700"
                  )}>
                    {currentResult?.isCorrect ? 'Chính xác!' : 'Chưa đúng'}
                  </p>
                  {!currentResult?.isCorrect && (
                    <p className="text-sm text-muted-foreground">
                      Đáp án đúng: {Array.isArray(currentResult?.correctAnswer) 
                        ? currentResult?.correctAnswer.join(', ') 
                        : currentResult?.correctAnswer}
                    </p>
                  )}
                </div>
              </div>

              {/* Explanation */}
              {currentQuestion.explanation && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-blue-700 mb-2">💡 Giải thích:</p>
                  <div 
                    className="text-sm text-blue-800"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                  />
                </div>
              )}

              <Button className="w-full" onClick={nextQuestion}>
                {currentIndex < questions.length - 1 ? (
                  <>Câu tiếp theo <ChevronRight className="h-4 w-4 ml-1" /></>
                ) : (
                  'Hoàn thành'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Progress */}
      <div className="flex justify-center gap-1 mt-4">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full",
              idx === currentIndex && "bg-primary",
              idx < currentIndex && results[questions[idx].id]?.isCorrect && "bg-green-500",
              idx < currentIndex && !results[questions[idx].id]?.isCorrect && "bg-red-500",
              idx > currentIndex && "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
