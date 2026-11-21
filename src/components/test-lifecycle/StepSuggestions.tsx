"use client";

import { forwardRef, useImperativeHandle, useState, type KeyboardEvent } from "react";
import { useTlStepSuggestions } from "@/hooks/useTestLifecycle";
import type { StepQuery } from "@/lib/step-autocomplete";

export interface StepSuggestionsHandle {
  /** Handles ↑/↓/Enter/Tab/Esc while the menu is open; true when the key was consumed. */
  handleKey: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

/**
 * Suggestion menu for the step being typed. Rendered by StepsEditor only when
 * autocomplete is enabled; queries the step index (implemented phrases first).
 */
export const StepSuggestions = forwardRef<
  StepSuggestionsHandle,
  { query: StepQuery; onPick: (text: string) => void; onDismiss: () => void }
>(function StepSuggestions({ query, onPick, onDismiss }, ref) {
  const { data } = useTlStepSuggestions(query.query, query.keyword);
  const items = query.query.trim().length >= 2 ? (data ?? []) : [];
  const [active, setActive] = useState(0);
  const index = Math.min(active, Math.max(items.length - 1, 0));

  useImperativeHandle(
    ref,
    () => ({
      handleKey: (e) => {
        if (items.length === 0) return false;
        if (e.key === "ArrowDown") {
          setActive((index + 1) % items.length);
        } else if (e.key === "ArrowUp") {
          setActive((index - 1 + items.length) % items.length);
        } else if (e.key === "Enter" || e.key === "Tab") {
          onPick(items[index].text);
          setActive(0);
        } else if (e.key === "Escape") {
          onDismiss();
        } else {
          return false;
        }
        e.preventDefault();
        return true;
      },
    }),
    [items, index, onPick, onDismiss],
  );

  if (items.length === 0) return null;
  return (
    <ul
      role="listbox"
      aria-label="Step suggeriti"
      className="absolute left-2 right-2 z-10 mt-1 max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-surface shadow-md text-[12.5px] font-sans"
    >
      {items.map((item, i) => (
        <li
          key={`${item.keyword}-${item.text}`}
          role="option"
          aria-selected={i === index}
          className="flex items-center justify-between gap-2 px-2 py-1 cursor-pointer"
          style={i === index ? { background: "var(--hover)" } : undefined}
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus in the textarea
            onPick(item.text);
          }}
        >
          <span className="font-mono truncate">{item.text}</span>
          <span className="shrink-0 text-[11px] text-text-muted">
            {item.implemented ? "implementato" : `${item.occurrences}×`}
          </span>
        </li>
      ))}
    </ul>
  );
});
