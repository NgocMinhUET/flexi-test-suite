import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GradingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalQuestions: number;
  gradedQuestions: number;
  resultData: any | null;
  errorMessage: string | null;
}

interface UseBackgroundGradingOptions {
  onComplete?: (resultData: any) => void;
  onError?: (error: string) => void;
}

export function useBackgroundGrading(options: UseBackgroundGradingOptions = {}) {
  const [job, setJob] = useState<GradingJob | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  
  // Guard to prevent calling onComplete/onError multiple times
  const completedRef = useRef(false);

  // Subscribe to realtime updates for the grading job
  useEffect(() => {
    if (!job?.id) return;
    
    // Reset completed guard when job ID changes
    completedRef.current = false;

    const channel = supabase
      .channel(`grading-job-${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grading_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          console.log('Grading job update:', data);

          setJob({
            id: data.id,
            status: data.status,
            progress: data.progress || 0,
            totalQuestions: data.total_questions || 0,
            gradedQuestions: data.graded_questions || 0,
            resultData: data.result_data,
            errorMessage: data.error_message,
          });

          // Guard: Only call callbacks once per job completion
          if (data.status === 'completed' && !completedRef.current) {
            completedRef.current = true;
            setIsGrading(false);
            options.onComplete?.(data.result_data);
          } else if (data.status === 'failed' && !completedRef.current) {
            completedRef.current = true;
            setIsGrading(false);
            options.onError?.(data.error_message || 'Grading failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.id, options.onComplete, options.onError]);

  const startBackgroundGrading = useCallback(async (
    userId: string,
    examId: string,
    answers: Record<string, string | string[]>,
    questions: any[],
    startTime: number
  ) => {
    try {
      setIsGrading(true);

      // Count coding questions
      const codingCount = questions.filter(q => q.type === 'coding').length;

      // Create grading job record
      const { data: jobData, error: insertError } = await supabase
        .from('grading_jobs')
        .insert({
          user_id: userId,
          exam_id: examId,
          status: 'pending',
          progress: 0,
          total_questions: questions.length,
          graded_questions: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setJob({
        id: jobData.id,
        status: 'pending',
        progress: 0,
        totalQuestions: questions.length,
        gradedQuestions: 0,
        resultData: null,
        errorMessage: null,
      });

      // Call edge function to start background grading
      const { error: invokeError } = await supabase.functions.invoke('grade-exam-background', {
        body: {
          jobId: jobData.id,
          userId,
          examId,
          answers,
          questions,
          startTime,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      return jobData.id;
    } catch (error) {
      console.error('Error starting background grading:', error);
      setIsGrading(false);
      throw error;
    }
  }, []);

  const cancelGrading = useCallback(() => {
    setJob(null);
    setIsGrading(false);
  }, []);

  return {
    job,
    isGrading,
    startBackgroundGrading,
    cancelGrading,
  };
}
