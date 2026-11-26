"use client";

import { useId, useState } from "react";
import { Check, X } from "lucide-react";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  addCustomTag,
  FLAKY_TAG,
  RESERVED_TAGS,
  removeTag,
  setStatusTag,
  STATUS_TAGS,
  toggleFlaky,
  type StatusTag,
} from "@/lib/test-lifecycle";

const isStatus = (tag: string) => (STATUS_TAGS as readonly string[]).includes(tag);

/**
 * Tags of a scenario in three parts: exactly one status (`@runnable`, `@skip`, `@broken`), the
 * optional `@flaky`, and any other tag as a removable chip. Every change touches only the tag
 * it is about and hands the whole new list to `onChange`.
 */
export function ScenarioTagsEditor({
  value,
  readOnly,
  suggestions,
  onChange,
}: {
  value: string[];
  readOnly: boolean;
  suggestions: readonly string[];
  onChange: (tags: string[]) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statuses = value.filter(isStatus);
  const status: StatusTag | "" = statuses.length === 1 ? (statuses[0] as StatusTag) : "";
  const others = value.filter((t) => !isStatus(t) && t !== FLAKY_TAG);
  const offered = suggestions.filter((s) => !RESERVED_TAGS.includes(s) && !value.includes(s));

  const add = () => {
    const out = addCustomTag(value, draft);
    if (out.error) {
      setError(out.error);
      return;
    }
    setError(null);
    setDraft("");
    if (out.tags !== value) onChange(out.tags);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-4">
        <SegmentedControl<StatusTag | "">
          label="Stato"
          value={status}
          readOnly={readOnly}
          options={STATUS_TAGS.map((s) => ({ value: s, label: `@${s}` }))}
          onChange={(s) => s && onChange(setStatusTag(value, s))}
        />
        <label
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 font-mono text-[12px] text-text-dim has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-text has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40"
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={value.includes(FLAKY_TAG)}
            disabled={readOnly}
            onChange={() => onChange(toggleFlaky(value))}
          />
          {value.includes(FLAKY_TAG) && <Check size={12} aria-hidden data-testid="flaky-on" />}
          @{FLAKY_TAG}
        </label>
      </div>
      {statuses.length !== 1 && (
        <p className="text-[12px]" style={{ color: "var(--danger)" }}>
          Serve uno e un solo stato tra @runnable, @skip, @broken prima dell&apos;invio in review.
        </p>
      )}

      <fieldset className="flex flex-col gap-1 text-xs text-text-dim">
        <legend className="mb-1">Altri tag</legend>
        <div className="flex flex-wrap items-center gap-1.5">
          {others.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-subtle px-2 py-1 font-mono text-[12px] text-text"
            >
              @{tag}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Rimuovi @${tag}`}
                  className="grid place-items-center text-text-muted hover:text-text"
                  onClick={() => onChange(removeTag(value, tag))}
                >
                  <X size={12} aria-hidden />
                </button>
              )}
            </span>
          ))}
          {others.length === 0 && readOnly && <span className="text-text-muted">Nessuno</span>}
          {!readOnly && (
            <span className="inline-flex items-center gap-1.5">
              <input
                aria-label="Nuovo tag"
                list={listId}
                value={draft}
                placeholder="@nuovo_tag"
                className={`${INPUT_CLASS} h-8 w-36 font-mono text-[12px]`}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={add}>
                Aggiungi
              </button>
              <datalist id={listId}>
                {offered.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </span>
          )}
        </div>
        {error && (
          <p role="alert" className="text-[12px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </fieldset>
    </div>
  );
}
