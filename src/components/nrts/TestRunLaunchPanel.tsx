"use client";

import { useState, type FormEvent } from "react";
import { INPUT_CLASS, SELECT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import {
  useLaunchRun,
  useQualityGateSuites,
  useRuns,
  type QualityGateEnvironment,
  type QualityGateRunRequest,
  type QualityGateTestType,
} from "@/hooks/useQualityGate";
import { RunsStatusList, launchErrorMessage, withPendingRun } from "./RunsStatusList";

const SUITE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const TAGS_PATTERN = /^[@A-Za-z0-9_,.~-]{0,200}$/;
const TEST_TYPES: QualityGateTestType[] = ["integration", "e2e", "api"];
const ENVIRONMENTS: QualityGateEnvironment[] = ["dev", "uat"];

type LaunchOrigin = "QG" | "TAS";

const COPY: Record<LaunchOrigin, { title: string; what: string; runsLabel: string }> = {
  QG: { title: "Lancia Quality Gate", what: "il Quality Gate", runsLabel: "Run Quality Gate recenti" },
  TAS: { title: "Lancia TAS", what: "il TAS", runsLabel: "Run TAS recenti" },
};

/**
 * Launches the TAS workflow through the Hub backend: as a Quality Gate (`QG`) or as a plain
 * TAS run (`TAS`). The two share the form; the origin decides the endpoint and the run name.
 */
export function TestRunLaunchPanel({ origin, suites = [] }: { origin: LaunchOrigin; suites?: string[] }) {
  const copy = COPY[origin];
  const [suite, setSuite] = useState("");
  const [testType, setTestType] = useState<QualityGateTestType>("integration");
  const [environment, setEnvironment] = useState<QualityGateEnvironment>("uat");
  const [tags, setTags] = useState("@runnable");
  const [allure, setAllure] = useState(true);
  const launch = useLaunchRun<QualityGateRunRequest>(origin);
  const launched = launch.isSuccess ? launch.data : undefined;
  const { data: listedRuns = [], isError: hasRunsError } = useRuns(origin, launched?.correlation_id);
  const runs = withPendingRun(launched, listedRuns);

  const { data: catalogData } = useQualityGateSuites();
  // Null when the TAS repository could not be read: the choice is then not restricted.
  const catalog = catalogData?.available ? catalogData.suites : null;

  const suiteValue = suite.trim().toLowerCase();
  const suiteFormatOk = SUITE_PATTERN.test(suiteValue);
  const suiteUnknown = catalog !== null && suiteFormatOk && !(suiteValue in catalog);
  const typeOptions: QualityGateTestType[] =
    catalog !== null && suiteValue in catalog ? catalog[suiteValue] : TEST_TYPES;
  // The selected type follows the suite: if it does not exist for it, fall back to one that does.
  const effectiveType = typeOptions.includes(testType) ? testType : typeOptions[0];
  const suggestions = catalog !== null ? Object.keys(catalog) : suites;
  const isValid = suiteFormatOk && !suiteUnknown && TAGS_PATTERN.test(tags);
  const listId = `${origin.toLowerCase()}-suites`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || launch.isPending) return;
    launch.mutate({ test_suite: suiteValue, test_type: effectiveType, environment, tags, allure });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={copy.title}
      className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-4"
    >
      <p className="font-mono uppercase text-text-muted" style={{ fontSize: 10, letterSpacing: ".06em" }}>
        {copy.title}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-medium text-text-dim">
          Suite
          <input
            list={listId}
            className={INPUT_CLASS}
            value={suite}
            onChange={(e) => setSuite(e.target.value)}
            placeholder="es. checkout"
            required
          />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-text-dim">
          Tipo di test
          <select className={SELECT_CLASS} value={effectiveType} onChange={(e) => setTestType(e.target.value as QualityGateTestType)}>
            {typeOptions.map((t) => (
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
        <button type="submit" disabled={!isValid || launch.isPending} className={PRIMARY_BUTTON_CLASS}>
          {launch.isPending ? "Avvio…" : "Lancia"}
        </button>
      </div>
      {suiteUnknown && (
        <p role="status" className="text-[13px] text-warning">
          La suite «{suiteValue}» non esiste nel repository TAS.
        </p>
      )}
      <RunsStatusList runs={runs} label={copy.runsLabel} />
      {hasRunsError && (
        <p className="text-[13px] text-text-muted">Stato delle run non disponibile, riprovo…</p>
      )}
      {launch.isError && (
        <p role="alert" className="text-[13px] text-danger">{launchErrorMessage(launch.error, copy.what)}</p>
      )}
    </form>
  );
}
