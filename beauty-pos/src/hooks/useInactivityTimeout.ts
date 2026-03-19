import { useEffect, useRef } from "react";

type Options = {
  timeoutMs: number;
  onTimeout: () => void | Promise<void>;
  enabled?: boolean;
};

export function useInactivityTimeout({
  timeoutMs,
  onTimeout,
  enabled = true,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    function resetTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void onTimeout();
      }, timeoutMs);
    }

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ] as const;

    function handleActivity() {
      resetTimer();
    }

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMs, onTimeout, enabled]);
}
