import type { FlakyState } from "@/types/flaky";

const SEGMENTS = [1, 2, 3, 4, 5];

export function FlakinessLevel({ level, score, state }: { level: number | null; score: number | null; state: FlakyState }) {
  if (state === "BROKEN") {
    return <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-text">Rotto</span>;
  }
  if (state === "INSUFFICIENT_DATA" || level == null) {
    return <span className="rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-text-muted">Dati insuff.</span>;
  }
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`Flakiness livello ${level} su 5, punteggio ${score ?? 0}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {SEGMENTS.map((segment) => {
          const filled = segment <= level;
          return (
            <span
              key={segment}
              data-segment
              data-filled={filled}
              className="h-2 w-3.5 rounded-sm"
              style={{ background: filled ? `var(--flaky-l${level})` : "var(--neutral-soft)" }}
            />
          );
        })}
      </span>
      <span aria-hidden="true" className="w-3 font-bold text-text">{level}</span>
      <span aria-hidden="true" className="text-[11px] text-text-muted">{score}</span>
    </span>
  );
}
