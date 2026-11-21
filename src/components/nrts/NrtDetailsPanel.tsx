import type { ChangeEvent, MouseEvent } from "react";
import type {  TestExecution, FlakyScenario, TestRun, NrtsListObject } from "@/types";
import NrtSaveButton from "./NrtSaveButton";
import { RunModal } from "./RunModal";
import { ArrowUpRight, Loader2 } from "lucide-react";
import {useState} from "react"
import {
  buildAllureScenarioUrl,
  type RunOrigin,
  createFlakyScenario,
  formatNrtTimestamp,
  isFlakyScenarioEqual,
  isScenarioInFlakyScenarios,
  formatNrtDuration,
} from "@/utils/nrtUtils";
import {
  NRT_RUN_STATUSES,
  NRT_SCENARIO_TABLE_HEADERS,
} from "@/utils/nrtsCostants";
import {DetailField} from "./DetailField";
import { parseJiraIssueKey } from "@/utils/jiraIssue";
import { JiraIssueField } from "./JiraIssueField";
import { ghaRunId } from "@/utils/qualityGateReport";
import { flakyScoreKey, useRunScenarioScores } from "@/hooks/useFlaky";
import { FlakinessLevel } from "@/components/flaky/FlakinessLevel";
import { formatFlakyRate } from "@/components/flaky/flakyFormat";
import type { FlakyScenarioRow } from "@/types/flaky";
import { classifyRunScenario, summarizeRunFlakiness, type RunScenarioCategory } from "./runFlakiness";
import type { ReactNode } from "react";

const SECTION_TITLE_CLASS = "mb-2 block text-[11px] font-semibold tracking-wider text-text-dim uppercase";

function DetailCard({ title, columns = 2, children }: { title: string; columns?: 1 | 2; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface px-4 py-3">
      <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
      <dl className={`grid gap-x-5 gap-y-3 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>{children}</dl>
    </section>
  );
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  FAILED: "bg-danger-soft text-danger",
  BROKEN: "bg-warning-soft text-warning",
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  const value = status?.toUpperCase() ?? "—";
  return (
    <span data-status={value} className={`rounded-md px-2 py-0.5 font-mono text-[12px] font-bold ${STATUS_BADGE_CLASSES[value] ?? "bg-neutral-soft text-text-dim"}`}>
      {value}
    </span>
  );
}

function formatScenarioDuration(durationMs: number | null | undefined): string {
  if (durationMs == null) return "—";
  return `${(durationMs / 1000).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
}

function ScenarioFlakiness({ score, suggestMark }: { score: FlakyScenarioRow | undefined; suggestMark: boolean }) {
  if (!score) {
    return <FlakinessLevel level={null} score={null} state="INSUFFICIENT_DATA" />;
  }
  const tooltip = `Punteggio ${score.score ?? "—"} · flip ${formatFlakyRate(score.flip_rate)} · pass on retry ${formatFlakyRate(score.retry_pass_rate)} · ${score.runs_analyzed} run analizzate`;
  return (
    <span className="inline-flex flex-col gap-0.5" title={tooltip}>
      <FlakinessLevel level={score.level} score={score.score} state={score.state} />
      {suggestMark && <span className="text-[11px] font-semibold text-danger">Da marcare</span>}
    </span>
  );
}

const SUMMARY_CHIPS: Array<{ category: RunScenarioCategory; one: string; many: string; className: string }> = [
  { category: "to_mark", one: "da marcare flaky", many: "da marcare flaky", className: "bg-danger-soft text-danger" },
  { category: "flagged", one: "già marcato", many: "già marcati", className: "bg-warning-soft text-warning" },
  { category: "regression", one: "stabile: probabile regressione", many: "stabili: probabile regressione", className: "bg-neutral-soft text-text-dim" },
];

function RunFlakinessSummary({ summary }: { summary: Record<RunScenarioCategory, number> }) {
  const chips = SUMMARY_CHIPS.filter((chip) => summary[chip.category] > 0);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip.category} className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${chip.className}`}>
          {summary[chip.category]} {summary[chip.category] === 1 ? chip.one : chip.many}
        </span>
      ))}
    </div>
  );
}

function FlakySwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => { event.stopPropagation(); onChange(); }}
      className={`relative inline-block h-[17px] w-[30px] rounded-full transition-colors ${checked ? "bg-warning" : "bg-border-strong"}`}
    >
      <span className={`absolute top-0.5 size-[13px] rounded-full bg-white transition-all ${checked ? "left-[15px]" : "left-0.5"}`} />
    </button>
  );
}

export function NrtDetailsPanel({
  details,
  isLoading,
  hasError,
  modified,
  onModifiedChange,
  onSave,
  isSaving,
  hasSaveError,
  flakyScenarios,
  setFlakyScenarios,
  fetchJiraIssue,
  handleIssueInputChange,
  handleRevisionNoteChange,
  handleRunNoteChange,
  isTasOnly,
  origin = "TAS",
}: {
  details?: NrtsListObject;
  isLoading: boolean;
  hasError: boolean;
  modified: boolean;
  onModifiedChange: (modified: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
  hasSaveError: boolean;
  flakyScenarios: FlakyScenario[];
  setFlakyScenarios: (flakyScenarios: FlakyScenario[]) => void;
  fetchJiraIssue: (issueId: string, testRun: TestRun, isQaIssue: boolean) => Promise<boolean>;
  handleIssueInputChange: (event: ChangeEvent<HTMLInputElement>, runId: string, field: "product" | "qa") => void;
  handleRevisionNoteChange: (updatedNrt: NrtsListObject, scenario: TestExecution, scenarios: TestExecution[], event: ChangeEvent<HTMLTextAreaElement>) => void;
  /** Edits the general note of the run (NRT only). */
  handleRunNoteChange: (updatedNrt: NrtsListObject, event: ChangeEvent<HTMLTextAreaElement>) => void;
  isTasOnly: boolean;
  origin?: RunOrigin;
}) {
  const [jiraIssueNotFound, setJiraIssueNotFound] = useState({ product: false, qa: false });
  const [activeReport, setActiveReport] = useState<{ url: string; title: string } | null>(null);
  const notPassed = (details?.test_execution ?? []).filter(
    (scenario) => scenario.status?.toLowerCase() !== NRT_RUN_STATUSES.passed,
  );
  const { scores, env: flakyEnv } = useRunScenarioScores({
    env: details?.test_run?.env,
    testObject: details?.test_suite.test_object ?? "",
    scenarioNames: notPassed.flatMap((scenario) => (scenario.scenario_name ? [scenario.scenario_name] : [])),
  });

  function openReport(event: MouseEvent<HTMLAnchorElement>, title: string) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveReport({ url: event.currentTarget.href, title });
  }

  async function checkJiraIssue(issueId: string, isQaIssue: boolean) {
    const field = isQaIssue ? "qa" : "product";
    setJiraIssueNotFound((current) => ({ ...current, [field]: false }));
    if (!issueId.trim() || !details) return;

    const issueKey = parseJiraIssueKey(issueId);
    if (!issueKey) {
      setJiraIssueNotFound((current) => ({ ...current, [field]: true }));
      return;
    }

    try {
      const found = await fetchJiraIssue(issueKey, details.test_run, isQaIssue);
      setJiraIssueNotFound((current) => ({ ...current, [field]: !found }));
    } catch {
      return
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[13px] text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Caricamento dettagli…
      </div>
    );
  }

  if (hasError) return <p className="py-4 text-[13px] text-danger">Errore nel caricamento dei dettagli NRT.</p>;
  if (!details) return <p className="py-4 text-[13px] text-text-muted">Dettagli non disponibili.</p>;

  const { test_suite: suite } = details;
  const visibleScenarioColumns = NRT_SCENARIO_TABLE_HEADERS.filter(
    (column) => !isTasOnly || column.visibleInTas,
  );
  const visibleScenarioColumnIds = new Set(visibleScenarioColumns.map((column) => column.id));
  const allScenarios = details.test_execution ?? [];
  const flakinessHeader = flakyEnv ? `Flakiness ${flakyEnv}` : "Flakiness";
  const rows = notPassed.map((scenario) => {
    const score = scenario.scenario_name ? scores.get(flakyScoreKey(suite.test_type, scenario.scenario_name)) : undefined;
    const flagged = isScenarioInFlakyScenarios(scenario, suite, details.test_run?.test_version, flakyScenarios);
    return { scenario, score, flagged, category: classifyRunScenario(score, flagged) };
  });
  const summary = summarizeRunFlakiness(rows.map((row) => row.category));

  function handleCheckboxChange(updatedScenario: TestExecution) {
    const updatedFlakyScenario = createFlakyScenario(
      updatedScenario,
      suite,
      details?.test_run?.test_version,
    );
    const existingScenario = flakyScenarios.some(
      (flakyScenario) => isFlakyScenarioEqual(flakyScenario, updatedFlakyScenario),
    ) ? flakyScenarios.map((flakyScenario) =>
          isFlakyScenarioEqual(flakyScenario, updatedFlakyScenario)
            ? { ...flakyScenario, is_flaky: !flakyScenario.is_flaky }
            : flakyScenario,
        ): [
        ...flakyScenarios,
        updatedFlakyScenario,
      ];

    setFlakyScenarios(existingScenario);
  }

  const ghaLink = details.test_run.gha_run_url ? (
    <a
      href={details.test_run.gha_run_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      Run #{ghaRunId(details.test_run.gha_run_url) ?? "—"} <ArrowUpRight className="inline" size={14} aria-hidden />
    </a>
  ) : null;
  const envChip = details.test_run?.env ? (
    <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">
      {details.test_run.env}
    </span>
  ) : null;

  return (
    <div className="flex flex-col">
      {origin === "QG" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <DetailCard title="Run">
            <DetailField label="Ambiente" value={envChip} />
            <DetailField label="Versione test suite" value={details.test_run?.test_version} mono />
          </DetailCard>
          <DetailCard title="Revisione">
            <DetailField label="Revisore" value={details.test_run.revisioned_by} />
            <DetailField label="Esecuzione GitHub Actions" value={ghaLink} />
          </DetailCard>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr_1fr]">
          <DetailCard title="Suite">
            <DetailField label="Test object" value={suite.test_object} />
            <DetailField label="Tipo suite" value={suite.test_type} />
            <DetailField label="Versione test object" value={suite.test_object_version} mono />
            <DetailField label="Team owner" value={suite.owner_team} />
          </DetailCard>
          <DetailCard title="Run">
            <DetailField label="Ambiente" value={envChip} />
            <DetailField label="Versione test suite" value={details.test_run?.test_version} mono />
            <DetailField label="Inizio" value={formatNrtTimestamp(details.test_run?.timestamp_start ?? null)} mono />
            <DetailField label="Fine" value={formatNrtTimestamp(details.test_run?.timestamp_end ?? null)} mono />
            <DetailField label="Durata" value={formatNrtDuration(details.test_run?.duration_ms ?? null)} mono />
          </DetailCard>
          <DetailCard title="Revisione" columns={1}>
            <DetailField label="Revisore" value={details.test_run.revisioned_by} />
            {!isTasOnly && (
              <JiraIssueField
                field="product"
                value={details.test_run?.product_issue ?? ""}
                issueNotFound={jiraIssueNotFound.product}
                onBlur={(event) => checkJiraIssue(event.target.value, false)}
                onChange={(event) => { setJiraIssueNotFound((current) => ({ ...current, product: false })); handleIssueInputChange(event, details.test_run?.id ?? "", "product"); }}
              />
            )}
            {!isTasOnly && (
              <JiraIssueField
                field="qa"
                value={details.test_run?.qa_issue ?? ""}
                issueNotFound={jiraIssueNotFound.qa}
                onBlur={(event) => checkJiraIssue(event.target.value, true)}
                onChange={(event) => { setJiraIssueNotFound((current) => ({ ...current, qa: false })); handleIssueInputChange(event, details.test_run?.id ?? "", "qa"); }}
              />
            )}
          </DetailCard>
        </div>
      )}

      {!isTasOnly && (
        <div className="mt-4">
          <label htmlFor={`run-note-${details.test_run.id}`} className={SECTION_TITLE_CLASS}>
            Note della run
          </label>
          <textarea
            id={`run-note-${details.test_run.id}`}
            value={details.test_run.note ?? ""}
            onChange={(event) => { handleRunNoteChange(details, event); onModifiedChange(true); }}
            rows={2}
            placeholder="Nota generale facoltativa sulla run"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-text focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
          />
        </div>
      )}

      <div>
        <div className="mt-5 mb-2 flex flex-wrap items-baseline gap-3">
          <h2 className={`${SECTION_TITLE_CLASS} mb-0`}>
            {origin === "QG" ? "Scenari falliti" : "Scenari non passati"}{" "}
            <span className="font-mono normal-case">
              ({origin === "QG" ? allScenarios.length : `${notPassed.length} di ${allScenarios.length}`})
            </span>
          </h2>
          <RunFlakinessSummary summary={summary} />
        </div>
        {notPassed.length === 0 ? (
          <p className="text-[13px] text-text-dim">{origin === "QG" ? "Nessuno scenario fallito." : "Nessuno scenario non passato in questa run."}</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse text-[13.5px]">
              <thead className="sticky top-0 z-10 bg-bg">
                <tr className="border-b border-border">
                  {visibleScenarioColumns.map((column) => (
                    <th key={column.id} className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-text-dim uppercase">
                      {column.id === "flakiness" ? flakinessHeader : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ scenario, score, flagged, category }) => (
                  <tr key={scenario.id} className="border-b border-border align-top last:border-0">
                    {visibleScenarioColumnIds.has("scenario") && <td className="px-3 py-2.5 font-semibold text-text">
                      <a href={scenario.allure_url == null? buildAllureScenarioUrl(details.test_run, suite.test_object, scenario.allure_id ?? "") : scenario.allure_url ?? ""} onClick={(event) => openReport(event, scenario.scenario_name ?? "Allure scenario")} target="_blank" rel="noopener noreferrer" className="hover:underline">{scenario.scenario_name ?? "—"} <ArrowUpRight className="inline text-accent" size={14} aria-hidden /></a></td>}
                    {visibleScenarioColumnIds.has("status") && <td className="px-3 py-2.5"><StatusBadge status={scenario.status} /></td>}
                    {visibleScenarioColumnIds.has("flakiness") && <td className="px-3 py-2.5 whitespace-nowrap">
                      <ScenarioFlakiness score={score} suggestMark={category === "to_mark" && !flagged} />
                    </td>}
                    {visibleScenarioColumnIds.has("duration") && <td className="px-3 py-2.5 font-mono text-[12.5px] whitespace-nowrap text-text-dim">
                      {formatScenarioDuration(scenario.duration_ms)}
                    </td>}
                    {visibleScenarioColumnIds.has("retries") && <td className="px-3 py-2.5 font-mono text-[12.5px] text-text-dim">{scenario.retries ?? "—"}</td>}
                    {visibleScenarioColumnIds.has("error") && <td className="max-w-md px-3 py-2.5">
                      {scenario.error_message ? (
                        <span title={scenario.error_message} className="line-clamp-2 font-mono text-[12.5px] text-danger">{scenario.error_message}</span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>}
                    {visibleScenarioColumnIds.has("flaky") && <td className="px-3 py-2.5">
                      <FlakySwitch
                        checked={flagged}
                        label={`Flaky: ${scenario.scenario_name ?? ""}`}
                        onChange={() => { handleCheckboxChange(scenario); onModifiedChange(true); }}
                      />
                    </td>}
                    {visibleScenarioColumnIds.has("note") && <td className="min-w-48 px-3 py-2">
                      <textarea aria-label={`Nota di revisione: ${scenario.scenario_name ?? ""}`} placeholder="Nota di revisione" value={scenario.revision_note ?? ""} onChange={(event) => { handleRevisionNoteChange(details, scenario, details.test_execution ?? [], event); onModifiedChange(true); }} className="w-full rounded-md border border-border-strong bg-surface px-2 py-1 text-[13px] text-text focus:border-accent focus:outline-none" />
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {modified && !isTasOnly && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
           <NrtSaveButton
              hasSaveError={hasSaveError}
              onSave={onSave}
              isSaving={isSaving}
              modified={modified}
            />
          </div>
        )}
      </div>
      <RunModal
        run={details}
        open={activeReport !== null}
        onClose={() => setActiveReport(null)}
        reportUrl={activeReport?.url}
        reportTitle={activeReport?.title}
        isTasOnly={isTasOnly}
        origin={origin}
      />
    </div>
  );
}
