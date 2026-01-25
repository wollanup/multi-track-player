import { useCallback, useRef } from 'react';

/**
 * Hook to throttle a function call
 * @param callback - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled version of the callback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      // Clear any pending timeout
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (timeSinceLastCall >= delay) {
        // Enough time has passed, call immediately
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Too soon, schedule for later
        timeoutRef.current = window.setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );

  return throttled as T;
}
