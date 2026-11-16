import { ArrowUpRight, ChartColumn, Undo2, ArrowUp, CircleHelp, Flag, type LucideIcon } from "lucide-react";
import { GithubMark } from "@/components/release-status/GithubMark";
import { formatDetectionWindow, formatShortDateTime } from "@/components/release-status/format";
import { ACCENT_LINK_CLASS as linkClass, OUTCOME_COLOR, OUTCOME_LABEL } from "@/components/release-status/shared";
import type { DeployEvent, RunRef } from "@/types/release-status";

const DIRECTION: Record<DeployEvent["direction"], { icon: LucideIcon; label: string; color: string }> = {
  upgrade: { icon: ArrowUp, label: "aggiornamento", color: "text-success" },
  rollback: { icon: Undo2, label: "rollback", color: "text-warning" },
  unknown: { icon: CircleHelp, label: "direzione non determinata", color: "text-text-muted" },
  baseline: { icon: Flag, label: "prima rilevazione", color: "text-info" },
};

function RunItem({ run }: { run: RunRef }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="font-mono font-medium text-text">{run.kind}</span>
      {run.trigger_type && <span className="text-text-muted">{run.trigger_type}</span>}
      <span className="text-text-muted">{formatShortDateTime(run.timestamp_start)}</span>
      <span className={`font-medium ${OUTCOME_COLOR[run.outcome]}`}>{OUTCOME_LABEL[run.outcome]}</span>
      {run.needs_review && <span className="text-warning">da revisionare</span>}
      {run.passed !== null && run.failed !== null && (
        <span className="text-text-dim">
          {run.passed} ok / {run.failed} ko
        </span>
      )}
      <span className="flex items-center gap-2">
        <a href={run.hub_url} className={linkClass} aria-label={`Report ${run.kind}`}>
          <ArrowUpRight className="size-3" aria-hidden="true" /> Report
        </a>
        {run.allure_url && (
          <a href={run.allure_url} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label={`Allure ${run.kind}`}>
            <ChartColumn className="size-3" aria-hidden="true" /> Allure
          </a>
        )}
        {run.gha_run_url && (
          <a
            href={run.gha_run_url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label={`GitHub Actions ${run.kind}`}
          >
            <GithubMark className="size-3" /> GitHub Actions
          </a>
        )}
      </span>
    </li>
  );
}

function EventItem({ event, showRuns }: { event: DeployEvent; showRuns: boolean }) {
  const direction = DIRECTION[event.direction];
  const Icon = direction.icon;
  return (
    <li className="relative border-l border-border pb-5 pl-5 last:pb-0">
      <span className="absolute -left-2.5 top-0 flex size-5 items-center justify-center rounded-full border border-border bg-surface">
        <Icon role="img" aria-label={direction.label} className={`size-3 ${direction.color}`} />
      </span>
      <p className="font-mono text-sm font-semibold text-text">{event.version}</p>
      <p className="text-xs text-text-muted">
        {event.is_baseline
          ? "prima rilevazione"
          : event.previous_seen_at
            ? `rilevato il ${formatShortDateTime(event.detected_at)} (tra ${formatDetectionWindow(event.previous_seen_at, event.detected_at)})`
            : `rilevato il ${formatShortDateTime(event.detected_at)}`}
        {event.is_baseline && ` · ${formatShortDateTime(event.detected_at)}`}
      </p>
      {showRuns && event.runs.length > 0 && (
        <ul aria-label={`Run della versione ${event.version}`} className="mt-2 flex flex-col gap-1.5 rounded-lg bg-subtle p-2">
          {event.runs.map((run) => (
            <RunItem key={run.run_id} run={run} />
          ))}
        </ul>
      )}
    </li>
  );
}

interface DeployTimelineProps {
  events: DeployEvent[];
  /** Runs are linked to environment deploys only, not to GitHub releases. */
  showRuns: boolean;
}

/** Vertical timeline of deploy events, newest first. */
export function DeployTimeline({ events, showRuns }: DeployTimelineProps) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">Nessun rilascio registrato</p>;
  }
  const sorted = [...events].sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  return (
    <ol className="ml-2.5 flex flex-col">
      {sorted.map((event) => (
        <EventItem key={`${event.detected_at}-${event.version}`} event={event} showRuns={showRuns} />
      ))}
    </ol>
  );
}
