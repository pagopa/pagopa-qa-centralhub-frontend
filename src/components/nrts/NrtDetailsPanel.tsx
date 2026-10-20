import type { ChangeEvent } from "react";
import type { NrtDetailsObject, TestExecution, FlakyScenario, TestRun, NrtsListObject } from "@/types";
import NrtSaveButton from "./NrtSaveButton";
import { ArrowUpRight, Loader2 } from "lucide-react";
import {useState} from "react"
import {
  buildAllureRunUrl,
  buildAllureScenarioUrl,
  buildAiAnalysisUrl,
  createFlakyScenario,
  formatNrtTimestamp,
  isFlakyScenarioEqual,
  isScenarioInFlakyScenarios,
} from "@/utils/nrtUtils";
import {
  NRT_RUN_STATUSES,
  NRT_SCENARIO_TABLE_HEADERS,
} from "@/utils/nrtsCostants";

export function NrtDetailsPanel({
  details,
  isLoading,
  hasError,
  modified,
  onModifiedChange,
  onSave,
  scenarios,
  setScenarios,
  isSaving,
  hasSaveError,
  modifiedScenarioIds,
  setModifiedScenarioIds,
  flakyScenarios,
  setFlakyScenarios,
  fetchJiraIssue,
  handleIssueInputChange,
}: {
  details?: NrtsListObject;
  isLoading: boolean;
  hasError: boolean;
  modified: boolean;
  onModifiedChange: (modified: boolean) => void;
  onSave: () => void;
  scenarios: TestExecution[];
  setScenarios: (scenarios: TestExecution[]) => void;
  isSaving: boolean;
  hasSaveError: boolean;
  modifiedScenarioIds: Set<string>;
  setModifiedScenarioIds: (modifiedScenarioIds: Set<string>) => void;
  modifiedRunIds: Set<string>;
  flakyScenarios: FlakyScenario[];
  setFlakyScenarios: (flakyScenarios: FlakyScenario[]) => void;
  fetchJiraIssue: (issueId: string, testRun: TestRun, isQaIssue: boolean) => Promise<boolean>;
  handleIssueInputChange: (event: ChangeEvent<HTMLInputElement>, runId: string, field: "product" | "qa") => void;
}) {
  const [jiraIssueNotFound, setJiraIssueNotFound] = useState({ product: false, test: false });

  async function checkJiraIssue(issueId: string, isQaIssue: boolean) {
    const field = isQaIssue ? "test" : "product";
    setJiraIssueNotFound((current) => ({ ...current, [field]: false }));
    if (!issueId.trim() || !details) return;

    try {
      const found = await fetchJiraIssue(issueId.trim(), details.test_run, isQaIssue);
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
  

    
  function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div>
        <dt className="text-text-muted">{label}</dt>
        <dd className="text-text">{value || "—"}</dd>
      </div>
    );
  }

  function handleCheckboxChange(updatedScenario: TestExecution, scenarios: TestExecution[]) {
    setModifiedScenarioIds(new Set([...modifiedScenarioIds, updatedScenario.id ?? ""]));

    const updatedFlakyScenario = createFlakyScenario(
      updatedScenario,
      suite,
      details?.test_run?.test_version,
    );
    const existingScenario = flakyScenarios.some(
      (flakyScenario) => isFlakyScenarioEqual(flakyScenario, updatedFlakyScenario),
    );

    if (existingScenario) {
      setFlakyScenarios(
        flakyScenarios.map((flakyScenario) =>
          isFlakyScenarioEqual(flakyScenario, updatedFlakyScenario)
            ? { ...flakyScenario, is_flaky: !flakyScenario.is_flaky }
            : flakyScenario,
        ),
      );
    } else {
      setFlakyScenarios([
        ...flakyScenarios,
        updatedFlakyScenario,
      ]);
    }
  }


  function handleRevisionNoteChange(updatedScenario: TestExecution, event: ChangeEvent<HTMLTextAreaElement>, scenarios: TestExecution[]) {
    const modifiedScenarios = scenarios.map(scenario =>
      scenario.id === updatedScenario.id ? { ...scenario, revision_note: event.target.value } : scenario
    );
    setScenarios(modifiedScenarios);
    setModifiedScenarioIds(new Set([...modifiedScenarioIds, updatedScenario.id ?? ""]));
  }


  return (
    <div className="flex flex-col ">
      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase text-text-muted">Suite e run</h2>
        <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Tipo suite" value={suite.test_type} />
          <DetailField label="Versione suite" value={suite.suite_version} />
          <DetailField label="Team owner" value={suite.owner_team} />
          <DetailField label="Ambiente" value={details.test_run?.env} />
          <DetailField label="Versione test" value={details.test_run?.test_version} />
          <DetailField label="Origine" value={details.test_run?.test_origin} />
          <DetailField label="Inizio" value={formatNrtTimestamp(details.test_run?.timestamp_start ?? null)} />
          <DetailField label="Fine" value={formatNrtTimestamp(details.test_run?.timestamp_end ?? null)} />
          <div>
            <dt className="text-text-muted">Ticket fix prodotto:</dt>{" "}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={details.test_run?.product_issue ?? ""}
                onBlur={(event) => checkJiraIssue(event.target.value, false)}
                onChange={(event) => { setJiraIssueNotFound((current) => ({ ...current, product: false })); handleIssueInputChange(event, details.test_run?.id ?? "", "product"); }}
                className="border border-border bg-surface text-text text-base px-2 py-1"
              />
              {jiraIssueNotFound.product && <span className="text-danger text-[12px]">Nessuna issue Jira trovata</span>}
            </div>
          </div>
          <div>
            <dt className="text-text-muted">Ticket fix test:</dt>{" "}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={details.test_run?.qa_issue ?? ""}
                onBlur={(event) => checkJiraIssue(event.target.value, true)}
                onChange={(event) => { setJiraIssueNotFound((current) => ({ ...current, test: false })); handleIssueInputChange(event, details.test_run?.id ?? "", "qa"); }}
                className="border border-border bg-surface text-text text-base px-2 py-1"
              />
              {jiraIssueNotFound.test && <span className="text-danger text-[12px]">Nessuna issue Jira trovata</span>}
            </div>
          </div>   
          </dl>     
           <div className="flex justify-center space-x-7 px-10 py-3 text-center " onClick={(e) => e.stopPropagation()}>
                    <a
                      href={details.test_run.allure_url == null ? buildAllureRunUrl(details.test_run, suite.test_object) : details.test_run?.allure_url ?? ""}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-lg hover:underline">
                      📊 Allure
                    </a>
                    <a
                      href={buildAiAnalysisUrl(details.test_run, suite.test_object)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-lg hover:underline">
                      🤖 AI Analysis
                    </a>
          </div> 
      </div>

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase text-text-muted">
          Scenari <span className="font-mono">({scenarios.length})</span>
        </h2>
        {scenarios.length === 0 ? (
          <p className="text-[12px] text-text-muted">Nessuno scenario associato a questa run.</p>
        ) : (
          <div className="max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-border">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border">
                  {NRT_SCENARIO_TABLE_HEADERS.map((heading) => (
                    <th key={heading} className="w-[14%] px-3 py-2 text-left font-medium text-text-muted">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.filter((scenario) => scenario.status !== NRT_RUN_STATUSES.passed).map((scenario) => (
                  <tr key={scenario.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text">
                      <a href={scenario.allure_url == null? buildAllureScenarioUrl(details.test_run, suite.test_object, scenario.allure_id ?? "") : scenario.allure_url ?? ""} target="_blank" rel="noopener noreferrer"><span>{scenario.scenario_name ?? "—"} <ArrowUpRight className="inline" size={20}></ArrowUpRight></span></a></td>
                    <td className="px-3 py-2 font-mono">{scenario.status}</td>
                    <td className="px-3 py-2 font-mono text-text-dim">
                      {scenario.duration_ms == null ? "—" : `${scenario.duration_ms} ms`}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-dim">{scenario.retries ?? "—"}</td>
                    <td className="px-3 py-2 text-danger">{scenario.error_message ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-text-dim">
                        <input type="checkbox" checked={isScenarioInFlakyScenarios(scenario, suite, details.test_run?.test_version, flakyScenarios)} onChange={() => { handleCheckboxChange(scenario, scenarios); onModifiedChange(true); }} />
                    </td>
                    <td>
                      <textarea value={scenario.revision_note ?? ""} onChange={(event) => { handleRevisionNoteChange(scenario, event, scenarios); onModifiedChange(true); }} className="w-full rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[12px] px-2 py-1" />
                    </td> 
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {modified && (
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
    </div>
  );
}
