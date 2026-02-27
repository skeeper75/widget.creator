"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface JsonEditorProps {
  /** Current JSON value (parsed object or null) */
  value: unknown;
  /** Callback when value changes (parsed object) */
  onChange: (value: unknown) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** CSS class for the container */
  className?: string;
  /** Minimum height of the textarea */
  minHeight?: string;
}

/**
 * JSON editor with syntax validation, formatting, and copy support.
 * Used for templateConfig JSONB fields in product_editor_mapping.
 */
export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  className,
  minHeight = "200px",
}: JsonEditorProps) {
  const [text, setText] = useState(() => formatJson(value));
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (raw: string) => {
      setText(raw);
      if (raw.trim() === "") {
        setError(null);
        onChange(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        setError(null);
        onChange(parsed);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [onChange],
  );

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      setText(formatted);
      setError(null);
    } catch {
      toast.error("Cannot format: invalid JSON");
    }
  }, [text]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  }, [text]);

  const handleReset = useCallback(() => {
    const formatted = formatJson(value);
    setText(formatted);
    setError(null);
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {!readOnly && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFormat}
            >
              <Check className="h-3 w-3 mr-1" />
              Format
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
      </div>
      <textarea
        className={cn(
          "w-full rounded-md border bg-muted/50 p-3 font-mono text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          error && "border-destructive",
          readOnly && "cursor-default opacity-70",
        )}
        style={{ minHeight }}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function formatJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}
