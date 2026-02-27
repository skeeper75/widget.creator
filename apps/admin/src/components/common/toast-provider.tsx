"use client";

import { Toaster } from "sonner";

/**
 * Toast notification provider wrapper.
 * REQ-U-005: Success/failure toast notifications for data changes.
 * Place this in the root layout.
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "font-sans",
          success: "border-green-500",
          error: "border-destructive",
        },
        duration: 4000,
      }}
      richColors
      closeButton
    />
  );
}
