import { useState, useEffect, useCallback, useRef } from 'react';
import { ExamSection } from '@/types/exam';

interface UseSectionedTimerProps {
  sections: ExamSection[];
  currentSectionIndex: number;
  onSectionTimeUp: () => void;
  savedSectionTimes?: Record<string, number>; // Remaining time per section in seconds
  isEnabled: boolean;
}

interface UseSectionedTimerReturn {
  currentSectionTimeLeft: number; // seconds
  formattedSectionTime: string;
  isWarning: boolean;
  isCritical: boolean;
  sectionProgress: { current: number; total: number };
  allSectionTimes: Record<string, number>; // For auto-save
}

export const useSectionedTimer = ({
  sections,
  currentSectionIndex,
  onSectionTimeUp,
  savedSectionTimes,
  isEnabled,
}: UseSectionedTimerProps): UseSectionedTimerReturn => {
  // Initialize section times
  const initializeSectionTimes = useCallback(() => {
    if (savedSectionTimes && Object.keys(savedSectionTimes).length > 0) {
      return savedSectionTimes;
    }
    // Initialize with full duration for each section
    const times: Record<string, number> = {};
    sections.forEach(section => {
      times[section.id] = section.duration * 60; // Convert to seconds
    });
    return times;
  }, [sections, savedSectionTimes]);

  // Track remaining time for each section
  const [sectionTimes, setSectionTimes] = useState<Record<string, number>>(initializeSectionTimes);
  const [isInitialized, setIsInitialized] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledTimeUp = useRef(false);

  const currentSection = sections[currentSectionIndex];
  const currentSectionId = currentSection?.id || '';
  const currentSectionTimeLeft = sectionTimes[currentSectionId] ?? 0;

  // Re-initialize when savedSectionTimes changes (restore from draft)
  useEffect(() => {
    if (savedSectionTimes && Object.keys(savedSectionTimes).length > 0 && !isInitialized) {
      setSectionTimes(savedSectionTimes);
      setIsInitialized(true);
    }
  }, [savedSectionTimes, isInitialized]);

  // Initialize times when sections change (but not if we have saved times)
  useEffect(() => {
    if (sections.length > 0 && !savedSectionTimes) {
      const times: Record<string, number> = {};
      sections.forEach(section => {
        // Only set time if not already set
        if (sectionTimes[section.id] === undefined) {
          times[section.id] = section.duration * 60;
        }
      });
      if (Object.keys(times).length > 0) {
        setSectionTimes(prev => ({ ...prev, ...times }));
      }
    }
  }, [sections, savedSectionTimes]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!isEnabled || !currentSectionId) return;

    hasCalledTimeUp.current = false;

    intervalRef.current = setInterval(() => {
      setSectionTimes(prev => {
        const currentTime = prev[currentSectionId] ?? 0;
        
        if (currentTime <= 1) {
          // Time's up for this section
          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true;
            setTimeout(() => onSectionTimeUp(), 0);
          }
          return { ...prev, [currentSectionId]: 0 };
        }
        
        return { ...prev, [currentSectionId]: currentTime - 1 };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isEnabled, currentSectionId, onSectionTimeUp]);

  // Reset timer flag when moving to new section
  useEffect(() => {
    hasCalledTimeUp.current = false;
  }, [currentSectionIndex]);

  const formattedSectionTime = formatTime(currentSectionTimeLeft);
  
  // Warning at 5 minutes, critical at 1 minute
  const isWarning = currentSectionTimeLeft <= 300 && currentSectionTimeLeft > 60;
  const isCritical = currentSectionTimeLeft <= 60;

  const sectionProgress = {
    current: currentSectionIndex + 1,
    total: sections.length || 1,
  };

  return {
    currentSectionTimeLeft,
    formattedSectionTime,
    isWarning,
    isCritical,
    sectionProgress,
    allSectionTimes: sectionTimes,
  };
};
