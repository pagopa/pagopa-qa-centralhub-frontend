"use client";

import type { TlLineError } from "@/types/test-lifecycle";

/**
 * Monospace steps editor with a line-number gutter. Lines reported in `errors`
 * (1-based, relative to the steps block) are highlighted and listed below.
 * The textarea grows with its content so the gutter stays aligned without
 * scroll syncing.
 */
export function StepsEditor({
  value,
  onChange,
  onBlur,
  errors = [],
  readOnly = false,
  label = "Step",
}: {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  errors?: TlLineError[];
  readOnly?: boolean;
  label?: string;
}) {
  const lines = value.split("\n");
  const errorLines = new Set(errors.map((e) => e.line));
  const rows = Math.max(lines.length, 3);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex rounded-[var(--radius-sm)] border border-border-strong bg-surface overflow-x-auto font-mono text-[12.5px]"
        style={{ lineHeight: "20px" }}
      >
        <div aria-hidden className="select-none py-2 text-right border-r border-border shrink-0">
          {Array.from({ length: rows }, (_, i) => {
            const n = i + 1;
            const isError = errorLines.has(n);
            return (
              <div
                key={n}
                data-testid={`steps-line-${n}`}
                data-error={isError ? "true" : "false"}
                className="px-2"
                style={
                  isError
                    ? { color: "var(--danger)", background: "var(--danger-soft)", fontWeight: 600 }
                    : { color: "var(--text-muted)" }
                }
              >
                {n}
              </div>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-0">
          <div aria-hidden className="absolute inset-0 py-2 pointer-events-none">
            {Array.from({ length: rows }, (_, i) => (
              <div
                key={i}
                style={{ height: 20, background: errorLines.has(i + 1) ? "var(--danger-soft)" : undefined }}
              />
            ))}
          </div>
          <textarea
            aria-label={label}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            rows={rows}
            wrap="off"
            spellCheck={false}
            className="relative block w-full resize-none bg-transparent py-2 px-2 text-text outline-none overflow-hidden whitespace-pre"
            style={{ lineHeight: "20px" }}
          />
        </div>
      </div>
      {errors.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-[12px]" style={{ color: "var(--danger)" }}>
          {errors.map((e, i) => (
            <li key={`${e.line}-${i}`}>
              Riga {e.line}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
