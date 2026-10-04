import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

interface UseSessionTimeoutOptions {
  timeoutMs?: number; // Inactivity timeout in ms (default: 15 minutes)
  backgroundTimeoutMs?: number; // Max background time before lock (default: 10 minutes)
  enabled?: boolean;
  onTimeout: () => void;
}

export function useSessionTimeout({
  timeoutMs = 15 * 60 * 1000, // 15 mins
  backgroundTimeoutMs = 10 * 60 * 1000, // 10 mins
  enabled = true,
  onTimeout,
}: UseSessionTimeoutOptions) {
  const lastActiveTimeRef = useRef<number>(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    lastActiveTimeRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onTimeout();
      }, timeoutMs);
    }
  };

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    resetTimer();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const now = Date.now();
      if (nextAppState === "background") {
        backgroundTimeRef.current = now;
      } else if (nextAppState === "active") {
        if (backgroundTimeRef.current) {
          const elapsedBackground = now - backgroundTimeRef.current;
          if (elapsedBackground > backgroundTimeoutMs) {
            onTimeout();
            return;
          }
        }
        backgroundTimeRef.current = null;
        resetTimer();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [enabled, timeoutMs, backgroundTimeoutMs, onTimeout]);

  return { resetTimer };
}
