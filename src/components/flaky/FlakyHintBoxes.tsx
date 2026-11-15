"use client";

import type { FlakyHint, FlakySummary } from "@/types/flaky";

interface HintBox {
  hint: FlakyHint;
  label: string;
  description: string;
  tone: string;
  activeTone: string;
  count: (summary: FlakySummary) => number;
}

const HINT_BOXES: HintBox[] = [
  {
    hint: "to_mark",
    label: "Da marcare",
    description: "Livello 4–5 ma senza flag flaky",
    tone: "text-danger",
    activeTone: "border-danger bg-danger-soft",
    count: (summary) => summary.to_mark,
  },
  {
    hint: "to_unmark",
    label: "Da smarcare",
    description: "Con flag ma livello 1 su almeno 10 run",
    tone: "text-success",
    activeTone: "border-success bg-success-soft",
    count: (summary) => summary.to_unmark,
  },
  {
    hint: "broken",
    label: "Rotti",
    description: "Falliti in tutte le ultime 5 run: bug, non flaky",
    tone: "text-text",
    activeTone: "border-text-dim bg-neutral-soft",
    count: (summary) => summary.broken,
  },
];

const EMPTY_SUMMARY: FlakySummary = { to_mark: 0, to_unmark: 0, broken: 0, flagged: 0, analyzed: 0 };

export function FlakyHintBoxes({
  summary = EMPTY_SUMMARY,
  active,
  onToggle,
}: {
  summary: FlakySummary | undefined;
  active: FlakyHint | null;
  onToggle: (hint: FlakyHint) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {HINT_BOXES.map((box) => {
        const isActive = active === box.hint;
        return (
          <button
            key={box.hint}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(box.hint)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors hover:border-border-strong ${
              isActive ? box.activeTone : "border-border bg-surface"
            }`}
          >
            <span className="block text-[11px] font-semibold tracking-wide text-text-dim uppercase">{box.label}</span>
            <span className={`block text-2xl font-bold ${box.tone}`}>{box.count(summary)}</span>
            <span className="block text-xs text-text-dim">{box.description}</span>
          </button>
        );
      })}
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <span className="block text-[11px] font-semibold tracking-wide text-text-dim uppercase">Marcati flaky</span>
        <span className="block text-2xl font-bold text-text">{summary.flagged}</span>
        <span className="block text-xs text-text-dim">su {summary.analyzed} scenari analizzati</span>
      </div>
    </div>
  );
}
