"use client";

import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { QualityGateRunResponse, QualityGateRunStatus } from "@/hooks/useQualityGate";

/** Message shown when a launch fails; `what` completes the fallback, e.g. "il Quality Gate". */
export function launchErrorMessage(error: unknown, what: string): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Lancio non configurato sul backend (token GitHub mancante).";
    if (error.status === 422) {
      // The backend explains a suite/type mismatch ("Suite 'x' has no 'y' tests (available: ...)").
      const detail = (error.body as { detail?: unknown } | null)?.detail;
      return typeof detail === "string" ? detail : "Parametri non validi o suite non lanciabile.";
    }
    if (error.status === 502) return "GitHub ha rifiutato l'avvio del workflow.";
  }
  return `Impossibile avviare ${what}.`;
}

/**
 * The runs to show: a run just dispatched is not listed by GitHub for a few seconds, so it is
 * shown as starting meanwhile.
 */
export function withPendingRun(
  launched: QualityGateRunResponse | undefined,
  listed: QualityGateRunStatus[],
): QualityGateRunStatus[] {
  if (!launched || listed.some((r) => r.correlation_id === launched.correlation_id)) return listed;
  return [
    {
      correlation_id: launched.correlation_id,
      run_name: launched.run_name,
      state: "pending",
      conclusion: null,
      html_url: launched.actions_url,
      created_at: null,
      updated_at: null,
    },
    ...listed,
  ];
}

type Tone = "info" | "success" | "danger" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-neutral-soft text-text-dim",
};

function describeRun(status?: QualityGateRunStatus): { label: string; tone: Tone; busy: boolean } {
  if (!status || status.state === "pending") {
    return { label: "Avvio in corso…", tone: "info", busy: true };
  }
  if (status.state === "queued") return { label: "In coda", tone: "info", busy: true };
  if (status.state === "in_progress") return { label: "In esecuzione", tone: "info", busy: true };
  switch (status.conclusion) {
    case "success":
      return { label: "Completata con successo", tone: "success", busy: false };
    case "failure":
    case "timed_out":
      return { label: "Fallita", tone: "danger", busy: false };
    case "cancelled":
      return { label: "Annullata", tone: "neutral", busy: false };
    default:
      return { label: `Terminata (${status.conclusion ?? "esito sconosciuto"})`, tone: "neutral", busy: false };
  }
}

function formatStarted(createdAt: string | null): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("it-IT");
}

/** Active and recent runs launched from the Hub, with their live state. */
export function RunsStatusList({ runs, label }: { runs: QualityGateRunStatus[]; label: string }) {
  if (runs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: ".06em" }}>
        Run in corso e recenti
      </p>
      <ul aria-label={label} className="flex flex-col gap-1.5">
        {runs.map((run) => {
          const { label: stateLabel, tone, busy } = describeRun(run);
          return (
            <li key={run.correlation_id} className="flex flex-wrap items-center gap-3 text-[13px] text-text-dim">
              <span className={`inline-flex min-w-44 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${TONE_CLASS[tone]}`}>
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                {stateLabel}
              </span>
              <span className="font-mono text-[12px]">{run.run_name}</span>
              <span className="text-text-muted">{formatStarted(run.created_at)}</span>
              <a href={run.html_url ?? undefined} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Apri su GitHub Actions
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
