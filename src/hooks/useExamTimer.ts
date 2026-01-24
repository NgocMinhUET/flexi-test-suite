import { useState, useEffect, useCallback, useRef } from 'react';

interface UseExamTimerProps {
  initialMinutes: number;
  onTimeUp?: () => void;
  isEnabled?: boolean; // Only count down when enabled
  savedTimeLeft?: number; // Restore time from draft (in seconds)
}

export const useExamTimer = ({ 
  initialMinutes, 
  onTimeUp, 
  isEnabled = true,
  savedTimeLeft,
}: UseExamTimerProps) => {
  // Initialize from saved time or calculate from initialMinutes
  const getInitialTime = useCallback(() => {
    if (savedTimeLeft !== undefined && savedTimeLeft > 0) {
      return savedTimeLeft;
    }
    return initialMinutes * 60;
  }, [initialMinutes, savedTimeLeft]);

  const [timeLeft, setTimeLeft] = useState(getInitialTime);
  const [isRunning, setIsRunning] = useState(false);
  const hasCalledTimeUp = useRef(false);

  // Update time when savedTimeLeft changes (draft restoration)
  useEffect(() => {
    if (savedTimeLeft !== undefined && savedTimeLeft > 0) {
      setTimeLeft(savedTimeLeft);
    }
  }, [savedTimeLeft]);

  // Start running when enabled
  useEffect(() => {
    if (isEnabled) {
      setIsRunning(true);
      hasCalledTimeUp.current = false;
    } else {
      setIsRunning(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isRunning || !isEnabled) {
      return;
    }

    if (timeLeft <= 0) {
      if (!hasCalledTimeUp.current && onTimeUp) {
        hasCalledTimeUp.current = true;
        onTimeUp();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!hasCalledTimeUp.current && onTimeUp) {
            hasCalledTimeUp.current = true;
            setTimeout(() => onTimeUp(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isEnabled, timeLeft, onTimeUp]);

  const formatTime = useCallback(() => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const pause = () => setIsRunning(false);
  const resume = () => setIsRunning(true);

  const isWarning = timeLeft <= 300 && timeLeft > 60; // 5 minutes warning
  const isCritical = timeLeft <= 60; // 1 minute critical

  return {
    timeLeft,
    formattedTime: formatTime(),
    isRunning,
    pause,
    resume,
    isWarning,
    isCritical,
  };
};
