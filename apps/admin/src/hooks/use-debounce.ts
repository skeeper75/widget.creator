"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a value by the specified delay (default 300ms).
 * Used primarily for search input debouncing in DataTable global search.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
