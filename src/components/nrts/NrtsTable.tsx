import type { NrtsListObject, NrtDetailsObject, TestExecution, TestRun, FlakyScenario } from "@/types";
import { Check, X } from "lucide-react";
import { Fragment, ChangeEvent,useState, useEffect } from "react";
import {
  calculatePassRate,
  calculatePassRateColor,
  getRevisionResultBackgroundColor,
} from "@/utils/nrtUtils";
import {
  NRT_REVISION_RESULT_OPTIONS,
  NRT_TABLE_HEADERS,
} from "@/utils/nrtsCostants";
import {NrtDetailsPanel} from "./NrtDetailsPanel";
import NrtPagination from "@/components/nrts/NrtPagination";
import NrtSaveButton from "./NrtSaveButton";
import { useUpdateNrt, useSaveFlakyScenarios } from "@/hooks/useNrts";
import { Chip, } from "@/components/primitives/Chip";
import {useJiraIssue} from "@/hooks/useJira";

interface NrtsTableProps {
  runs: NrtsListObject[];
  onNrtsChange: (nrts: NrtsListObject[]) => void;
  totalPages: number;
  onRowClick?: (runId: string | undefined) => void;
  selectedNrt?: string;
  selectedNrtDetails?: TestExecution[];
  isDetailsLoading?: boolean;
  hasDetailsError?: boolean;
  modified?: boolean;
  onModifiedChange: (modified: boolean) => void;
  flakyScenarios: FlakyScenario[];
  setFlakyScenarios: (flakyScenarios: FlakyScenario[]) => void;
  page: number;
  setPage: (page: number) => void;
}

export default function NrtsTable({
  runs = [],
  onNrtsChange,
  totalPages,
  onRowClick,
  selectedNrt,
  selectedNrtDetails,
  isDetailsLoading = false,
  hasDetailsError = false,
  modified = false,
  onModifiedChange,
  flakyScenarios,
  setFlakyScenarios,
  page,
  setPage,
}: NrtsTableProps) {
const jiraIssue = useJiraIssue();
const [scenarios, setScenarios] = useState<TestExecution[]>(selectedNrtDetails ?? []);
const updateNrt = useUpdateNrt();
const saveFlakyScenarios = useSaveFlakyScenarios();

const [modifiedRunIds, setModifiedRunIds] = useState(new Set<string>());
const [modifiedScenarioIds, setModifiedScenarioIds] = useState(new Set<string>());

useEffect(() => {
  setScenarios(selectedNrtDetails ?? []);
}, [selectedNrtDetails]);



  function handleTestRunRevisionResultChange(modifiedTestRun: TestRun | undefined, event: ChangeEvent<HTMLSelectElement>) {
    const modifiedRuns = runs.map((nrt) =>
      nrt.test_run.id === modifiedTestRun?.id
        ? { ...nrt, test_run: { ...nrt.test_run, revision_result: event.target.value } }
        : nrt
    );
    setModifiedRunIds(new Set([...modifiedRunIds, modifiedTestRun?.id ?? ""]));
    onNrtsChange(modifiedRuns);
    onModifiedChange(true);
  }


  function handleSave() {
    const modifiedTestRuns = runs.filter(nrt => modifiedRunIds.has(nrt.test_run?.id ?? "")).map(nrt => nrt.test_run);
    const modifiedScenarios = scenarios.filter(scenario => modifiedScenarioIds.has(scenario.id ?? ""));
    if (modifiedTestRuns.length === 0 && modifiedScenarios.length === 0 && flakyScenarios.length === 0) return;
    
    if (modifiedTestRuns.length > 0){
      updateNrt.mutate(
        {
        test_suites: runs.map(nrt => nrt.test_suite),
        test_runs: modifiedTestRuns,
        scenarios: modifiedScenarios,
        },
        { onSuccess: () => onModifiedChange(false) },
      );
    }
    if (flakyScenarios.length > 0) {
      saveFlakyScenarios.mutate(flakyScenarios, {
        onSuccess: () => onModifiedChange(false),
      });
    }
  }

  async function handleJiraIssueBlur(issueID: string, testRun: TestRun, isQaIssue: boolean): Promise<boolean> {
    try {
      const issueStatus = await jiraIssue.mutateAsync(issueID, {
        onSuccess: () => onModifiedChange(false),
      });
      if (!issueStatus) return false;
      const modifiedRuns = runs.map((nrt) =>
        nrt.test_run.id === testRun.id
          ? {
              ...nrt,
              test_run: {
                ...nrt.test_run,
                qa_issue: isQaIssue ? issueID : nrt.test_run.qa_issue,
                product_issue: !isQaIssue ? issueID : nrt.test_run.product_issue,
                product_issue_status: !isQaIssue ? issueStatus.fields.status.name : nrt.test_run.product_issue_status,
                qa_issue_status: isQaIssue ? issueStatus.fields.status.name : nrt.test_run.qa_issue_status,
              },
            }
          : nrt,
      );
      setModifiedRunIds(new Set([...modifiedRunIds, testRun.id]));
      onNrtsChange(modifiedRuns);
      onModifiedChange(true);
      return true;
    } catch (error) {
      return false;
    }
  }

  function handleIssueInputChange(event: ChangeEvent<HTMLInputElement>, runId: string, field: "product" | "qa") {
    const details = runs.map((nrt) => {
      if(nrt.test_run.id === runId) {
        return {
          ...nrt,
          test_run: {
            ...nrt.test_run,
            product_issue: field === "product" ? event.target.value : nrt.test_run.product_issue,
            qa_issue: field === "qa" ? event.target.value : nrt.test_run.qa_issue,
          },
        };
      }
      return nrt;
    });
    setModifiedRunIds(new Set([...modifiedRunIds, runId]));
    onNrtsChange(details);
  }


   return (
        <>
           <div className="mt-3 flex w-full items-end justify-between gap-3">
                    <span className="text-[13px] text-text-muted font-mono">({runs?.length ?? 0} totali)</span>

                  <NrtSaveButton
                    hasSaveError={updateNrt.isError}
                    onSave={handleSave}
                    isSaving={updateNrt.isPending}
                    modified={modified}
                  />
          </div>
          <NrtPagination page={page} totalPages={totalPages} setPage={setPage} />
          <div className="rounded-[var(--radius)] border border-border overflow-x-auto bg-surface">
            <table className="w-full table-auto border-collapse text-[13px] [&>thead>tr>th]:px-2 [&>tbody>tr>td:not([colspan])]:px-2 [&>tbody>tr>td:not([colspan])]:whitespace-nowrap">
              <thead>
                <tr className="bg-subtle border-b border-border">
                  {NRT_TABLE_HEADERS.map((heading) => (
                    <th
                      key={heading || "details"}
                      className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase whitespace-nowrap"
                      style={{ letterSpacing: ".05em" }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((nrt) => {
                  const passRate = calculatePassRate(nrt.test_run);
                  const isSelected = selectedNrt === nrt.test_run.id;
                  return (
                    <Fragment key={nrt.test_run.id}>
                    <tr
                      aria-expanded={isSelected}
                      tabIndex={0}
                      key={nrt.test_run.id}
                      className={` border-b border-border last:border-0 hover:bg-subtle cursor-pointer ${isSelected ? "bg-subtle" : ""}`}
                      onClick={() => onRowClick?.(isSelected ? undefined : nrt.test_run.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick?.(isSelected ? undefined : nrt.test_run.id);
                        }
                      }}
                    >
                      <td className="px-3 py-2 font-semibold text-text whitespace-nowrap">
                        {nrt.test_suite.test_object.toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-text-dim font-mono text-[12px] whitespace-nowrap">
                        {nrt.test_run.timestamp_start?.replace('T', ' ')}
                      </td>
                      <td className="px-3 py-2 font-mono float-center">{nrt.test_run.scenario_qty}</td>
                      <td className="px-3 py-2 font-mono text-success">{nrt.test_run.passed_scenario}</td>
                      <td className="px-3 py-2 font-mono text-danger">{nrt.test_run.failed_scenario}</td>
                      <td className="px-3 py-2 font-mono text-danger">{nrt.test_run.broken_scenario}</td>
                      <td className="px-3 py-2 font-mono text-text-muted">{nrt.test_run.skipped_scenario}</td>
                      <td className={`px-3 py-2 font-mono font-semibold ${calculatePassRateColor(passRate)}`}>
                        {passRate.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-text-muted">{nrt.test_run.trigger_type}</td>
                      <td className="px-3 py-2 text-text-muted">{nrt.test_run.test_origin ?? "—"}</td>
                      <td className="py-2 text-text-muted">
                         <div className="flex justify-center"><Chip variant="issueStatus" value={nrt.test_run.product_issue_status ?? ""} /></div>
                      </td>
                      <td className="py-2 text-text-muted">
                         <div className="flex justify-center"><Chip variant="issueStatus" value={nrt.test_run.qa_issue_status ?? ""} /></div>
                      </td>
                      <td><select
                      className="w-auto h-10 border border-border rounded" 
                      value={nrt.test_run.revision_result}
                      onChange={(e) => {handleTestRunRevisionResultChange(nrt.test_run, e); onModifiedChange(true);}}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      style={{ backgroundColor: getRevisionResultBackgroundColor(nrt.test_run.revision_result ?? "") }}
                      >
                      {NRT_REVISION_RESULT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>{label}</option>
                      ))}
                    </select></td>
                      <td className="px-3 py-2 text-text-muted">{nrt.test_run.revisioned ? <Check className="text-success" size={16} /> : <X className="text-danger" size={16} />}</td>
                    </tr>
                    {isSelected && (
                      <tr className="border-b border-border bg-subtle">
                        <td colSpan={NRT_TABLE_HEADERS.length} className="p-4">
                          <NrtDetailsPanel
                            details={nrt}
                            isLoading={isDetailsLoading}
                            hasError={hasDetailsError}
                            modified={modified}
                            onModifiedChange={onModifiedChange}
                            onSave={handleSave}
                            scenarios={scenarios}
                            setScenarios={setScenarios}
                            isSaving={updateNrt.isPending}
                            hasSaveError={updateNrt.isError}
                            modifiedScenarioIds={modifiedScenarioIds}
                            setModifiedScenarioIds={setModifiedScenarioIds}
                            modifiedRunIds={modifiedRunIds}
                            flakyScenarios={flakyScenarios}
                            setFlakyScenarios={setFlakyScenarios}
                            fetchJiraIssue={handleJiraIssueBlur}
                            handleIssueInputChange={handleIssueInputChange}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <NrtPagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
        );
  }
