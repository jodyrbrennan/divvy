import { useCallback, useRef, useEffect } from "react";
import { saveData } from "../utils/storage";

/**
 * Returns a debounced save function that waits for `delay` ms of inactivity
 * before actually writing to Supabase. Use for rapid-fire preference changes
 * (comm profile chips, relationship tags, etc.).
 *
 * IMPORTANT: Do NOT use for high-priority saves like task completions or
 * member additions — those should use saveData() directly for immediate persistence.
 *
 * The pending save fires on unmount so changes are never lost.
 */
export function useDebouncedSave(delay = 500) {
  const timerRef = useRef(null);
  const pendingDataRef = useRef(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingDataRef.current) {
      saveData(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  }, []);

  // Flush on unmount so pending changes are never lost
  useEffect(() => {
    return () => flush();
  }, [flush]);

  const debouncedSave = useCallback((data) => {
    pendingDataRef.current = data;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveData(data);
      pendingDataRef.current = null;
      timerRef.current = null;
    }, delay);
  }, [delay]);

  return { debouncedSave, flushSave: flush };
}
