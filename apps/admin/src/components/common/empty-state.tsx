"use client";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Icon to display (defaults to Inbox) */
  icon?: React.ReactNode;
  /** Message to display */
  message?: string;
  /** Description text below the message */
  description?: string;
  /** Action element (e.g. a create button) */
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  message = "No results found.",
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-medium">{message}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
