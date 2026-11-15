import type { OutcomePoint } from "@/types/flaky";
import { formatFlakyDate, OUTCOME_LABELS } from "./flakyFormat";

const OUTCOME_COLORS = { P: "var(--success)", R: "var(--warning)", F: "var(--danger)" } as const;

export function OutcomeStrip({ outcomes, size = 30 }: { outcomes: OutcomePoint[]; size?: number }) {
  const shown = outcomes.slice(-size);
  const padding = Math.max(0, size - shown.length);
  return (
    <ul aria-label="Ultime run" className="flex gap-px">
      {Array.from({ length: padding }, (_, index) => (
        <li key={`empty-${index}`} data-outcome="none" className="h-3.5 w-1 rounded-[1px] bg-neutral-soft" />
      ))}
      {shown.map((point) => (
        <li
          key={point.run_id}
          data-outcome={point.outcome}
          title={`${formatFlakyDate(point.ts)} · ${OUTCOME_LABELS[point.outcome]}`}
          className="h-3.5 w-1 rounded-[1px]"
          style={{ background: OUTCOME_COLORS[point.outcome] }}
        />
      ))}
    </ul>
  );
}
