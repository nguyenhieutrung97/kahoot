import { useState, useEffect, useCallback } from 'react';

interface UseCountdownOptions {
  initialValue: number;
  onComplete?: () => void;
  autoStart?: boolean;
  interval?: number;
}

interface UseCountdownReturn {
  timeLeft: number;
  isActive: boolean;
  isCompleted: boolean;
  start: () => void;
  stop: () => void;
  reset: (newValue?: number) => void;
}

export const useCountdown = ({
  initialValue,
  onComplete,
  autoStart = true,
  interval = 1000,
}: UseCountdownOptions): UseCountdownReturn => {
  const [timeLeft, setTimeLeft] = useState(initialValue);
  const [isActive, setIsActive] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);

  const start = useCallback(() => {
    setIsActive(true);
    setIsCompleted(false);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback((newValue?: number) => {
    setTimeLeft(newValue ?? initialValue);
    setIsActive(false);
    setIsCompleted(false);
  }, [initialValue]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsActive(false);
          setIsCompleted(true);
          onComplete?.();
          return 0;
        }
        return newTime;
      });
    }, interval);

    return () => clearTimeout(timer);
  }, [isActive, timeLeft, interval, onComplete]);

  return {
    timeLeft,
    isActive,
    isCompleted,
    start,
    stop,
    reset,
  };
};
