import { useState, useEffect, useCallback } from 'react';

interface UseExamTimerProps {
  initialMinutes: number;
  onTimeUp?: () => void;
}

export const useExamTimer = ({ initialMinutes, onTimeUp }: UseExamTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && onTimeUp) {
        onTimeUp();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeUp]);

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
