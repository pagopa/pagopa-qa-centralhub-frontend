import { Bot, FlaskConical, ShieldCheck, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/components/release-status/format";
import type { RunKind, RunOutcome, RunRef } from "@/types/release-status";

const KIND_ICON: Record<RunKind, LucideIcon> = { NRT: FlaskConical, QG: ShieldCheck, TAS: Bot };
const KIND_ORDER: readonly RunKind[] = ["NRT", "QG", "TAS"];

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  PASSED: "superata",
  FAILED: "fallita",
  NEUTRAL: "senza esito",
};

const OUTCOME_COLOR: Record<RunOutcome, string> = {
  PASSED: "text-success",
  FAILED: "text-danger",
  NEUTRAL: "text-text-dim",
};

function markerLabel(run: RunRef): string {
  const base = `${run.kind}: ${OUTCOME_LABEL[run.outcome]}`;
  return run.needs_review ? `${base}, da revisionare` : base;
}

interface TestMarkersProps {
  tests: RunRef[];
  hasTestObject: boolean;
}

/** Up to three 14 px icons, one per run kind, coloured by the outcome of the latest run. */
export function TestMarkers({ tests, hasTestObject }: TestMarkersProps) {
  if (!hasTestObject) return null;

  if (tests.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span tabIndex={0} className="inline-flex shrink-0 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <FlaskConical role="img" aria-label="non testata" className="size-3.5 text-text-muted opacity-60" />
            </span>
          }
        />
        <TooltipContent>Versione non testata</TooltipContent>
      </Tooltip>
    );
  }

  const runs = KIND_ORDER.flatMap((kind) => tests.find((run) => run.kind === kind) ?? []);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {runs.map((run) => {
              const Icon = KIND_ICON[run.kind];
              return (
                <span key={run.kind} className="relative inline-flex">
                  <Icon role="img" aria-label={markerLabel(run)} className={`size-3.5 ${OUTCOME_COLOR[run.outcome]}`} />
                  {run.needs_review && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-warning ring-1 ring-surface"
                    />
                  )}
                </span>
              );
            })}
          </span>
        }
      />
      <TooltipContent className="flex-col items-start gap-0.5">
        {runs.map((run) => (
          <span key={run.kind}>
            {markerLabel(run)} · {formatDateTime(run.timestamp_start)}
            {run.passed !== null && run.failed !== null && ` · ${run.passed} ok / ${run.failed} ko`}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}
