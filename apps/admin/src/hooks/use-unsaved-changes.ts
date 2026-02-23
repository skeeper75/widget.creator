"use client";

import { useEffect, useCallback, useRef } from "react";

interface UseUnsavedChangesOptions {
  /** Whether the form currently has unsaved changes */
  hasChanges: boolean;
  /** Custom warning message */
  message?: string;
}

/**
 * Hook to warn users about unsaved changes when navigating away.
 * Handles both browser navigation (beforeunload) and in-app navigation.
 *
 * REQ-S-004: Unsaved changes guard
 */
export function useUnsavedChanges({
  hasChanges,
  message = "저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?",
}: UseUnsavedChangesOptions) {
  const hasChangesRef = useRef(hasChanges);
  hasChangesRef.current = hasChanges;

  // Handle browser navigation (refresh, close tab, external URL)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasChangesRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a generic prompt
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [message]);

  /**
   * Call this before programmatic navigation to check for unsaved changes.
   * Returns true if navigation should proceed, false if it should be blocked.
   */
  const confirmNavigation = useCallback((): boolean => {
    if (!hasChangesRef.current) return true;
    return window.confirm(message);
  }, [message]);

  return { confirmNavigation };
}
