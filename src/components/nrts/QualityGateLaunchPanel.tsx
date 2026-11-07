"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { INPUT_CLASS, SELECT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import {
  useLaunchQualityGateRun,
  useQualityGateRuns,
  type QualityGateRunStatus,
  type QualityGateEnvironment,
  type QualityGateTestType,
} from "@/hooks/useQualityGate";

const SUITE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const TAGS_PATTERN = /^[@A-Za-z0-9_,.~-]{0,200}$/;
const TEST_TYPES: QualityGateTestType[] = ["integration", "e2e", "api"];
const ENVIRONMENTS: QualityGateEnvironment[] = ["dev", "uat"];


function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Lancio non configurato sul backend (token GitHub mancante).";
    if (error.status === 422) return "Parametri non validi o suite non lanciabile.";
    if (error.status === 502) return "GitHub ha rifiutato l'avvio del workflow.";
  }
  return "Impossibile avviare il Quality Gate.";
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

function RunsList({ runs }: { runs: QualityGateRunStatus[] }) {
  if (runs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: ".06em" }}>
        Run in corso e recenti
      </p>
      <ul aria-label="Run Quality Gate recenti" className="flex flex-col gap-1.5">
        {runs.map((run) => {
          const { label, tone, busy } = describeRun(run);
          return (
            <li key={run.correlation_id} className="flex flex-wrap items-center gap-3 text-[13px] text-text-dim">
              <span className={`inline-flex min-w-44 items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${TONE_CLASS[tone]}`}>
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                {label}
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

/** Launches the TAS workflow with isQualityGateRun=true through the Hub backend. */
export function QualityGateLaunchPanel({ suites = [] }: { suites?: string[] }) {
  const [suite, setSuite] = useState("");
  const [testType, setTestType] = useState<QualityGateTestType>("integration");
  const [environment, setEnvironment] = useState<QualityGateEnvironment>("uat");
  const [tags, setTags] = useState("@runnable");
  const [allure, setAllure] = useState(true);
  const launch = useLaunchQualityGateRun();
  const pendingId = launch.isSuccess ? launch.data.correlation_id : undefined;
  const { data: listedRuns = [], isError: hasRunsError } = useQualityGateRuns(pendingId);
  // A run just dispatched is not listed by GitHub for a few seconds: show it as starting meanwhile.
  const runs: QualityGateRunStatus[] =
    launch.isSuccess && !listedRuns.some((r) => r.correlation_id === launch.data.correlation_id)
      ? [
          {
            correlation_id: launch.data.correlation_id,
            run_name: launch.data.run_name,
            state: "pending",
            conclusion: null,
            html_url: launch.data.actions_url,
            created_at: null,
            updated_at: null,
          },
          ...listedRuns,
        ]
      : listedRuns;

  const suiteValue = suite.trim().toLowerCase();
  const isValid = SUITE_PATTERN.test(suiteValue) && TAGS_PATTERN.test(tags);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || launch.isPending) return;
    launch.mutate({ test_suite: suiteValue, test_type: testType, environment, tags, allure });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Lancia Quality Gate"
      className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-4"
    >
      <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: ".06em" }}>
        Lancia Quality Gate
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-medium text-text-dim">
          Suite
          <input
            list="qg-suites"
            className={INPUT_CLASS}
            value={suite}
            onChange={(e) => setSuite(e.target.value)}
            placeholder="es. checkout"
            required
          />
          <datalist id="qg-suites">
            {suites.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Tipo di test
          <select className={SELECT_CLASS} value={testType} onChange={(e) => setTestType(e.target.value as QualityGateTestType)}>
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Ambiente
          <select className={SELECT_CLASS} value={environment} onChange={(e) => setEnvironment(e.target.value as QualityGateEnvironment)}>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Tag
          <input className={INPUT_CLASS} value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label className="flex h-9 items-center gap-2 text-[13px] font-medium text-text-dim">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={allure} onChange={(e) => setAllure(e.target.checked)} />
          Allure
        </label>
        <button
          type="submit"
          disabled={!isValid || launch.isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {launch.isPending ? "Avvio…" : "Lancia"}
        </button>
      </div>
      <RunsList runs={runs} />
      {hasRunsError && (
        <p className="text-[13px] text-text-muted">Stato delle run non disponibile, riprovo…</p>
      )}
      {launch.isError && (
        <p role="alert" className="text-[13px] text-danger">{errorMessage(launch.error)}</p>
      )}
    </form>
  );
}
