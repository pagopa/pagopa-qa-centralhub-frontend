"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { HIGHLIGHT_COLOR, highlightLine } from "@/lib/gherkin-highlight";
import { applySuggestion, currentStepQuery } from "@/lib/step-autocomplete";
import type { TlLineError } from "@/types/test-lifecycle";
import { StepSuggestions, type StepSuggestionsHandle } from "./StepSuggestions";

/**
 * Monospace steps editor with a line-number gutter. Lines reported in `errors`
 * (1-based, relative to the steps block) are highlighted and listed below.
 * The textarea grows vertically with its content so the gutter stays aligned
 * without scroll syncing; long lines never wrap: the text area is as wide as
 * the longest line and its wrapper scrolls horizontally, so the gutter stays in
 * place and the scrollbar never covers the last line. `notice` is a short message shown
 * under the editor (e.g. live validation unavailable). With `autocomplete` the
 * editor suggests existing steps for the line being typed (↑/↓, Enter/Tab, Esc).
 */
export function StepsEditor({
  value,
  onChange,
  onBlur,
  errors = [],
  readOnly = false,
  label = "Step",
  notice = null,
  autocomplete = false,
}: {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  errors?: TlLineError[];
  readOnly?: boolean;
  label?: string;
  notice?: string | null;
  autocomplete?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<StepSuggestionsHandle>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const query =
    autocomplete && !readOnly && caret !== null && dismissedAt !== caret
      ? currentStepQuery(value, caret)
      : null;

  const trackCaret = () => setCaret(textareaRef.current?.selectionStart ?? null);
  const pick = (text: string) => {
    if (caret === null) return;
    const next = applySuggestion(value, caret, text);
    onChange?.(next.text);
    setCaret(next.caret);
    setDismissedAt(next.caret);
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(next.caret, next.caret));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query) menuRef.current?.handleKey(e);
  };

  const lines = value.split("\n");
  const errorLines = new Set(errors.map((e) => e.line));
  const rows = Math.max(lines.length, 3);
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex rounded-[var(--radius-sm)] border border-border-strong bg-surface overflow-hidden font-mono text-[12.5px]"
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
        <div data-testid="steps-scroll" className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
          {/* As wide as the longest line: the wrapper scrolls horizontally, the gutter stays put. */}
          <div className="relative" style={{ minWidth: `calc(${longest + 2}ch + 1rem)` }}>
            <div aria-hidden className="absolute inset-0 py-2 pointer-events-none">
              {lines.map((line, i) => (
                <div
                  key={i}
                  data-testid={`steps-mirror-${i + 1}`}
                  className="px-2 whitespace-pre"
                  style={{ height: 20, background: errorLines.has(i + 1) ? "var(--danger-soft)" : undefined }}
                >
                  {highlightLine(line).map((span, j) => (
                    <span key={j} data-kind={span.kind} style={{ color: HIGHLIGHT_COLOR[span.kind] }}>
                      {span.text}
                    </span>
                  ))}
                </div>
              ))}
              {/* min rows: keep the layer as tall as the textarea */}
              {Array.from({ length: Math.max(rows - lines.length, 0) }, (_, i) => (
                <div key={`pad-${i}`} style={{ height: 20 }} />
              ))}
            </div>
            <textarea
              ref={textareaRef}
              aria-label={label}
              value={value}
              readOnly={readOnly}
              onChange={(e) => {
                onChange?.(e.target.value);
                setCaret(e.target.selectionStart);
              }}
              onSelect={trackCaret}
              onKeyDown={onKeyDown}
              onBlur={() => {
                setCaret(null);
                onBlur?.();
              }}
              rows={rows}
              wrap="off"
              spellCheck={false}
              className="relative block w-full resize-none py-2 px-2 outline-none overflow-hidden whitespace-pre"
              // Inline on purpose: globals.css paints every textarea (unlayered, so it beats Tailwind
              // utilities) and would cover the coloured mirror layer behind it.
              style={{ lineHeight: "20px", color: "transparent", backgroundColor: "transparent", caretColor: "var(--text)" }}
            />
          </div>
        </div>
      </div>
      {query && (
        <div className="relative">
          <StepSuggestions
            ref={menuRef}
            query={query}
            onPick={pick}
            onDismiss={() => setDismissedAt(caret)}
          />
        </div>
      )}
      {notice && (
        <p role="status" className="text-[12px] text-text-muted">
          {notice}
        </p>
      )}
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
