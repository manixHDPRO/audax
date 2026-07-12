'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const;

interface UseInactivityLockOptions {
  enabled: boolean;
  timeoutMinutes: number;
}

export function useInactivityLock({ enabled, timeoutMinutes }: UseInactivityLockOptions) {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    clearTimer();
    setIsLocked(true);
  }, [clearTimer]);

  const unlock = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsLocked(false);
  }, []);

  const scheduleLock = useCallback(() => {
    clearTimer();
    if (!enabled || timeoutMinutes <= 0 || isLocked) return;

    const delayMs = timeoutMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, delayMs);
  }, [clearTimer, enabled, timeoutMinutes, isLocked]);

  const registerActivity = useCallback(() => {
    if (!enabled || isLocked) return;
    lastActivityRef.current = Date.now();
    scheduleLock();
  }, [enabled, isLocked, scheduleLock]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setIsLocked(false);
      return;
    }

    scheduleLock();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, registerActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || !enabled || isLocked) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const delayMs = timeoutMinutes * 60 * 1000;
      if (delayMs > 0 && elapsed >= delayMs) {
        setIsLocked(true);
        return;
      }

      lastActivityRef.current = Date.now();
      scheduleLock();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimer();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, registerActivity);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, timeoutMinutes, registerActivity, scheduleLock, clearTimer]);

  useEffect(() => {
    if (isLocked) {
      clearTimer();
    } else if (enabled) {
      scheduleLock();
    }
  }, [isLocked, enabled, scheduleLock, clearTimer]);

  return { isLocked, lock, unlock };
}
