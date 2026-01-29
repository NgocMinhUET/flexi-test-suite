import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Answer, ViolationStats } from '@/types/exam';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface ExamDraft {
  answers: Record<string, Answer>; // Use string keys to preserve any format
  flaggedQuestions: number[]; // Keep as number array for DB compatibility
  currentQuestion: number;
  violationStats: ViolationStats;
  savedAt: string;
  // Timer state - critical for restoration
  timeLeft?: number; // Non-sectioned exam: total seconds remaining
  startedAt?: number; // Unix timestamp when exam was started - for duration calculation
  // Sectioned exam state
  currentSection?: number;
  completedSections?: number[];
  sectionTimes?: Record<string, number>;
}

interface UseExamAutoSaveProps {
  examId: string;
  userId: string;
  answers: Map<number, Answer>;
  flaggedQuestions: Set<number>;
  currentQuestion: number;
  violationStats: ViolationStats;
  isEnabled: boolean;
  // Timer state for restoration
  timeLeft?: number; // Non-sectioned exam timer
  startedAt?: number; // Unix timestamp when exam was started
  // Sectioned exam state
  currentSection?: number;
  completedSections?: Set<number>;
  sectionTimes?: Record<string, number>;
}

interface UseExamAutoSaveReturn {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
  hasDraft: boolean;
  draftData: ExamDraft | null;
  restoreFromDraft: () => void;
  clearDraft: () => Promise<void>;
  dismissDraft: () => void;
}

const LOCAL_STORAGE_KEY = 'exam_draft_';
const LOCAL_SAVE_DEBOUNCE_MS = 2000;
const CLOUD_SYNC_INTERVAL_MS = 60000;

export const useExamAutoSave = ({
  examId,
  userId,
  answers,
  flaggedQuestions,
  currentQuestion,
  violationStats,
  isEnabled,
  timeLeft,
  startedAt,
  currentSection,
  completedSections,
  sectionTimes,
}: UseExamAutoSaveProps): UseExamAutoSaveReturn => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<ExamDraft | null>(null);
  
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  const getLocalStorageKey = useCallback(() => {
    return `${LOCAL_STORAGE_KEY}${examId}_${userId}`;
  }, [examId, userId]);

  // Convert current state to draft format
  // IMPORTANT: Use string keys for answers to preserve any ID format during JSON
  const getCurrentDraft = useCallback((): ExamDraft => {
    const answersObj: Record<string, Answer> = {};
    answers.forEach((value, key) => {
      // Store with string key to preserve format during serialization
      answersObj[String(key)] = value;
    });

    return {
      answers: answersObj,
      flaggedQuestions: Array.from(flaggedQuestions),
      currentQuestion,
      violationStats,
      savedAt: new Date().toISOString(),
      // Timer state - critical for restoration
      timeLeft,
      startedAt, // Unix timestamp when exam was started
      // Include section state if available
      currentSection,
      completedSections: completedSections ? Array.from(completedSections) : undefined,
      sectionTimes,
    };
  }, [answers, flaggedQuestions, currentQuestion, violationStats, timeLeft, startedAt, currentSection, completedSections, sectionTimes]);

  // Save to localStorage (fast, immediate backup)
  const saveToLocal = useCallback(() => {
    if (!isEnabled) return;

    try {
      const draft = getCurrentDraft();
      const draftStr = JSON.stringify(draft);
      
      // Skip if data hasn't changed
      if (draftStr === lastSavedDataRef.current) return;
      
      localStorage.setItem(getLocalStorageKey(), draftStr);
      lastSavedDataRef.current = draftStr;
      setLastSavedAt(new Date());
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
      setSaveStatus('error');
    }
  }, [isEnabled, getCurrentDraft, getLocalStorageKey]);

  // Sync to Supabase (cloud backup)
  const syncToCloud = useCallback(async () => {
    if (!isEnabled || !examId || !userId) return;

    try {
      setSaveStatus('saving');
      const draft = getCurrentDraft();

      // Prepare the data object with all fields
      const draftDbData = {
        answers: JSON.parse(JSON.stringify(draft.answers)) as Json,
        flagged_questions: draft.flaggedQuestions,
        current_question: draft.currentQuestion,
        violation_stats: JSON.parse(JSON.stringify(draft.violationStats)) as Json,
        saved_at: new Date().toISOString(),
        // Timer state for restoration
        time_left: draft.timeLeft || null,
        // Sectioned exam state
        current_section: draft.currentSection ?? null,
        completed_sections: draft.completedSections || null,
        section_times: draft.sectionTimes ? JSON.parse(JSON.stringify(draft.sectionTimes)) as Json : null,
      };

      // First try to update existing draft
      const { data: existing } = await supabase
        .from('exam_drafts')
        .select('id')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from('exam_drafts')
          .update(draftDbData)
          .eq('id', existing.id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('exam_drafts')
          .insert([{
            exam_id: examId,
            user_id: userId,
            ...draftDbData,
          }]);
        error = result.error;
      }

      if (error) throw error;
      
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to sync to cloud:', err);
      setSaveStatus('error');
    }
  }, [isEnabled, examId, userId, getCurrentDraft]);

  // Debounced local save on data change
  useEffect(() => {
    if (!isEnabled) return;

    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }

    setSaveStatus('saving');
    localSaveTimeoutRef.current = setTimeout(() => {
      saveToLocal();
    }, LOCAL_SAVE_DEBOUNCE_MS);

    return () => {
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
    };
  }, [answers, flaggedQuestions, currentQuestion, isEnabled, saveToLocal]);

  // Periodic cloud sync
  useEffect(() => {
    if (!isEnabled) return;

    cloudSyncIntervalRef.current = setInterval(() => {
      syncToCloud();
    }, CLOUD_SYNC_INTERVAL_MS);

    return () => {
      if (cloudSyncIntervalRef.current) {
        clearInterval(cloudSyncIntervalRef.current);
      }
    };
  }, [isEnabled, syncToCloud]);

  // Sync to cloud on tab blur/visibility change + HARDENED beforeunload
  useEffect(() => {
    if (!isEnabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        syncToCloud();
      }
    };

    const handleBeforeUnload = () => {
      // Force save to localStorage before unload (synchronous, always works)
      saveToLocal();
      
      // Also try sendBeacon for cloud sync (fire-and-forget, works during tab close)
      if (examId && userId && navigator.sendBeacon) {
        try {
          const draft = getCurrentDraft();
          const payload = JSON.stringify({
            exam_id: examId,
            user_id: userId,
            answers: draft.answers,
            flagged_questions: draft.flaggedQuestions,
            current_question: draft.currentQuestion,
            violation_stats: draft.violationStats,
            saved_at: new Date().toISOString(),
            time_left: draft.timeLeft || null,
            current_section: draft.currentSection ?? null,
            completed_sections: draft.completedSections || null,
            section_times: draft.sectionTimes || null,
          });
          
          // Use sendBeacon - it queues the request even if page is closing
          const beaconUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/exam_drafts?on_conflict=exam_id,user_id`;
          const headers = {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          };
          
          // Create blob with proper headers for POST
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(beaconUrl, blob);
        } catch (e) {
          console.warn('sendBeacon failed:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEnabled, syncToCloud, saveToLocal, examId, userId, getCurrentDraft]);

  // Check for existing draft on mount - IMPORTANT: Check even when not enabled
  // so we can show restore dialog before exam starts
  useEffect(() => {
    if (!examId || !userId) return;

    const checkForDraft = async () => {
      // Check localStorage first
      try {
        const localDraft = localStorage.getItem(getLocalStorageKey());
        if (localDraft) {
          const parsed = JSON.parse(localDraft) as ExamDraft;
          // Only show restore if there's actual data
          if (Object.keys(parsed.answers).length > 0) {
            setDraftData(parsed);
            setHasDraft(true);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to parse local draft:', err);
      }

      // Check cloud if no local draft
      try {
        const { data, error } = await supabase
          .from('exam_drafts')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data && Object.keys(data.answers as object || {}).length > 0) {
          const cloudDraft: ExamDraft = {
            answers: data.answers as unknown as Record<number, Answer>,
            flaggedQuestions: data.flagged_questions || [],
            currentQuestion: data.current_question || 0,
            violationStats: (data.violation_stats as unknown as ViolationStats) || { tabSwitchCount: 0, fullscreenExitCount: 0 },
            savedAt: data.saved_at,
            // Restore timer state
            timeLeft: data.time_left || undefined,
            // Restore sectioned exam state
            currentSection: data.current_section ?? undefined,
            completedSections: data.completed_sections || undefined,
            sectionTimes: data.section_times as unknown as Record<string, number> || undefined,
          };
          setDraftData(cloudDraft);
          setHasDraft(true);
        }
      } catch (err) {
        console.error('Failed to fetch cloud draft:', err);
      }
    };

    checkForDraft();
  }, [examId, userId, getLocalStorageKey]);

  // Restore from draft
  const restoreFromDraft = useCallback(() => {
    if (!draftData) return;
    setHasDraft(false);
    toast.success('Đã khôi phục bài làm trước đó');
  }, [draftData]);

  // Dismiss draft without restoring
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
    setDraftData(null);
  }, []);

  // Clear draft (after submission)
  const clearDraft = useCallback(async () => {
    // Clear localStorage
    try {
      localStorage.removeItem(getLocalStorageKey());
    } catch (err) {
      console.error('Failed to clear local draft:', err);
    }

    // Clear cloud draft
    if (examId && userId) {
      try {
        await supabase
          .from('exam_drafts')
          .delete()
          .eq('exam_id', examId)
          .eq('user_id', userId);
      } catch (err) {
        console.error('Failed to clear cloud draft:', err);
      }
    }

    setHasDraft(false);
    setDraftData(null);
    lastSavedDataRef.current = '';
  }, [examId, userId, getLocalStorageKey]);

  return {
    saveStatus,
    lastSavedAt,
    hasDraft,
    draftData,
    restoreFromDraft,
    clearDraft,
    dismissDraft,
  };
};
