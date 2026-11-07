"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import {
  useLaunchQualityGateRun,
  type QualityGateEnvironment,
  type QualityGateTestType,
} from "@/hooks/useQualityGate";

const SUITE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const TAGS_PATTERN = /^[@A-Za-z0-9_,.~-]{0,200}$/;
const TEST_TYPES: QualityGateTestType[] = ["integration", "e2e", "api"];
const ENVIRONMENTS: QualityGateEnvironment[] = ["dev", "uat"];

const FIELD_CLASS =
  "rounded-[var(--radius-sm)] border border-border bg-surface text-text text-base px-2 py-1";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Lancio non configurato sul backend (token GitHub mancante).";
    if (error.status === 422) return "Parametri non validi o suite non lanciabile.";
    if (error.status === 502) return "GitHub ha rifiutato l'avvio del workflow.";
  }
  return "Impossibile avviare il Quality Gate.";
}

/** Launches the TAS workflow with isQualityGateRun=true through the Hub backend. */
export function QualityGateLaunchPanel({ suites = [] }: { suites?: string[] }) {
  const [suite, setSuite] = useState("");
  const [testType, setTestType] = useState<QualityGateTestType>("integration");
  const [environment, setEnvironment] = useState<QualityGateEnvironment>("uat");
  const [tags, setTags] = useState("@runnable");
  const [allure, setAllure] = useState(true);
  const launch = useLaunchQualityGateRun();

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
        <label className="flex flex-col gap-1 text-[13px] text-text-muted">
          Suite
          <input
            list="qg-suites"
            className={FIELD_CLASS}
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
        <label className="flex flex-col gap-1 text-[13px] text-text-muted">
          Tipo di test
          <select className={FIELD_CLASS} value={testType} onChange={(e) => setTestType(e.target.value as QualityGateTestType)}>
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-text-muted">
          Ambiente
          <select className={FIELD_CLASS} value={environment} onChange={(e) => setEnvironment(e.target.value as QualityGateEnvironment)}>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-text-muted">
          Tag
          <input className={FIELD_CLASS} value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-text-muted">
          <input type="checkbox" checked={allure} onChange={(e) => setAllure(e.target.checked)} />
          Allure
        </label>
        <button
          type="submit"
          disabled={!isValid || launch.isPending}
          className="rounded-[var(--radius-sm)] bg-accent px-3 py-1 text-base text-white disabled:opacity-50"
        >
          {launch.isPending ? "Avvio…" : "Lancia"}
        </button>
      </div>
      {launch.isSuccess && (
        <p role="status" className="text-[13px] text-success">
          Workflow avviato ({launch.data.run_name}).{" "}
          <a href={launch.data.actions_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Apri su GitHub Actions
          </a>
          . Il report comparirà qui al termine dell&apos;esecuzione.
        </p>
      )}
      {launch.isError && (
        <p role="alert" className="text-[13px] text-danger">{errorMessage(launch.error)}</p>
      )}
    </form>
  );
}
