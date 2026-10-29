import { ref } from "vue";

/**
 * Why: Search and input debouncing composable to prevent server hammering.
 * When: Used in autocomplete, search filters, and real-time inputs.
 */
export function useDebounce() {
  function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): (...args: Parameters<T>) => void {
    let timeoutId: any = null;
    return (...args: Parameters<T>) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  }

  return {
    debounce
  };
}
