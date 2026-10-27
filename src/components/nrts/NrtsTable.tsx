import NrtPagination from "@/components/nrts/NrtPagination";
import { Chip, } from "@/components/primitives/Chip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useJiraIssue } from "@/hooks/useJira";
import { useSaveFlakyScenarios, useUpdateNrt } from "@/hooks/useNrts";
import type { FlakyScenario, NrtsListObject, TestExecution, TestRun } from "@/types";
import {
  calculatePassRate,
  calculatePassRateColor,
  formatNrtTimestamp,
  getRevisionResultBackgroundColor,
} from "@/utils/nrtUtils";
import {
  NRT_REVISION_RESULT_OPTIONS,
  NRT_TABLE_HEADERS,
} from "@/utils/nrtsCostants";
import { Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { ChangeEvent, Fragment, useState } from "react";
import { NrtDetailsPanel } from "./NrtDetailsPanel";
import NrtSaveButton from "./NrtSaveButton";

function NrtColumnHeader({ label, description }: { label: string; description: string }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <th
      scope="col"
      className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase whitespace-nowrap"
      style={{ letterSpacing: ".05em" }}
    >
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger
          render={(
            <button
              type="button"
              className="cursor-help rounded-sm text-left uppercase outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onPointerEnter={() => setTooltipOpen(true)}
              onPointerLeave={() => setTooltipOpen(false)}
              onFocus={() => setTooltipOpen(true)}
              onBlur={() => setTooltipOpen(false)}
            >
              {label}
            </button>
          )}
        />
        <TooltipContent>{description}</TooltipContent>
      </Tooltip>
    </th>
  );
}

interface NrtsTableProps {
  runs: NrtsListObject[];
  onNrtsChange: (nrts: NrtsListObject[]) => void;
  totalPages: number;
  onRowClick?: (runId: string | undefined) => void;
  selectedNrt?: string;
  isDetailsLoading?: boolean;
  hasDetailsError?: boolean;
  modified?: boolean;
  onModifiedChange: (modified: boolean) => void;
  page: number;
  setPage: (page: number) => void;
  isTasOnly: boolean;
  flakyScenariosData: FlakyScenario[];
}

export default function NrtsTable({
  runs = [],
  onNrtsChange,
  totalPages,
  onRowClick,
  selectedNrt,
  isDetailsLoading = false,
  hasDetailsError = false,
  modified = false,
  onModifiedChange,
  page,
  setPage,
  isTasOnly,
  flakyScenariosData,
}: NrtsTableProps) {
const jiraIssue = useJiraIssue();
const updateNrt = useUpdateNrt();
const saveFlakyScenarios = useSaveFlakyScenarios();
const visibleColumns = NRT_TABLE_HEADERS.filter((column) => !isTasOnly || column.visibleInTas);
const visibleColumnIds = new Set<string>(visibleColumns.map((column) => column.id));
const { data: session } = useSession();
const email = session?.user?.email ?? "";
const [modifiedScenarios, setModifiedScenarios] = useState<TestExecution[]>([]);
const [modifiedRunIds, setModifiedRunIds] = useState(new Set<string>());
const [flakyScenarios, setFlakyScenarios] = useState<FlakyScenario[]>(flakyScenariosData ?? []);


const flakyToUse = flakyScenarios.length > 0 ? flakyScenarios : flakyScenariosData;

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


  function handleSave(runsToSave = runs, runIdsToSave = modifiedRunIds) {
    let modifiedTestRuns = runsToSave.filter(nrt => runIdsToSave.has(nrt.test_run?.id ?? "")).map(nrt => nrt.test_run);
    if (modifiedTestRuns.length === 0 && modifiedScenarios.length === 0 && flakyScenarios.length === 0) return;
    
    if (modifiedTestRuns.length > 0 || modifiedScenarios.length > 0){
      modifiedTestRuns = modifiedTestRuns.map(testRun => ({ ...testRun, revisioned_by: email }));
      updateNrt.mutate(
        {
        test_suites: runsToSave.map(nrt => nrt.test_suite),
        test_runs: modifiedTestRuns,
        scenarios: modifiedScenarios,
        },
        { onSuccess: () => onModifiedChange(false) },
      );
    }
    if (flakyToUse.length > 0) {
      saveFlakyScenarios.mutate(flakyToUse, {
        onSuccess: () => onModifiedChange(false),
      });
    }

    onNrtsChange([])
    setFlakyScenarios([]);
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
      const updatedRunIds = new Set([...modifiedRunIds, testRun.id]);
      setModifiedRunIds(updatedRunIds);
      onNrtsChange(modifiedRuns);
      onModifiedChange(true);
      if (isTasOnly) {
        handleSave(modifiedRuns, updatedRunIds);
      }
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

  function handleScenarioRevisionNoteChange(updatedNrt: NrtsListObject,modifiedScenario: TestExecution, scenarios: TestExecution[], event: ChangeEvent<HTMLTextAreaElement>) {
    const updatedScenario = {
      ...modifiedScenario,
      revision_note: event.target.value,
    };

    setModifiedScenarios((previous) =>
      previous.some((scenario) => scenario.id === updatedScenario.id)
        ? previous.map((scenario) =>
            scenario.id === updatedScenario.id ? updatedScenario : scenario,
          )
        : [...previous, updatedScenario],
    );

    const nrtUpdatedScenarios = scenarios.map(scenario =>
      scenario.id === updatedScenario.id ? updatedScenario : scenario
    );
    
    const newNrts = runs.map(run => 
      run.test_run.id == updatedNrt.test_run.id? { ...run, test_execution: nrtUpdatedScenarios} : run )

    onNrtsChange(newNrts);
  }

   return (
        <>
           <div className="mt-3 flex w-full items-end justify-between gap-3">
                    <span className="text-[13px] text-text-muted font-mono">({runs?.length ?? 0} totali)</span>
                    {(!isTasOnly && 
                    <NrtSaveButton
                    hasSaveError={updateNrt.isError}
                    onSave={() => handleSave()}
                    isSaving={updateNrt.isPending}
                    modified={modified}
                  />  
                    )}   
          </div>
          <NrtPagination page={page} totalPages={totalPages} setPage={setPage} />
          <div className="rounded-[var(--radius)] border border-border overflow-x-auto bg-surface">
            <TooltipProvider>
            <table className="w-full table-auto border-collapse text-[13px] [&>thead>tr>th]:px-2 [&>tbody>tr>td:not([colspan])]:px-2 [&>tbody>tr>td:not([colspan])]:whitespace-nowrap">
              <thead>
                <tr className="bg-subtle border-b border-border">
                  {visibleColumns.map((column) => (
                    <NrtColumnHeader key={column.id} label={column.label} description={column.description} />
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
                      onClick={() => {setFlakyScenarios(flakyScenarios.length == 0? flakyScenariosData ?? [] : flakyScenarios);onRowClick?.(isSelected ? undefined : nrt.test_run.id); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setFlakyScenarios(flakyScenarios.length == 0? flakyScenariosData ?? [] : flakyScenarios);
                          onRowClick?.(isSelected ? undefined : nrt.test_run.id);
                        }
                      }}
                    >
                      {visibleColumnIds.has("suite") && <td className="px-3 py-2 font-semibold text-text whitespace-nowrap">
                        {nrt.test_suite.test_object.toUpperCase()}
                      </td>}
                      {visibleColumnIds.has("date") && <td className="px-3 py-2 text-text-dim font-mono text-[12px] whitespace-nowrap">
                        {formatNrtTimestamp(nrt.test_run.timestamp_start?.replace('T', ' '))}
                      </td>}
                      {visibleColumnIds.has("total") && <td className="px-3 py-2 font-mono float-center">{nrt.test_run.scenario_qty}</td>}
                      {visibleColumnIds.has("passed") && <td className="px-3 py-2 font-mono text-success">{nrt.test_run.passed_scenario}</td>}
                      {visibleColumnIds.has("failed") && <td className="px-3 py-2 font-mono text-danger">{nrt.test_run.failed_scenario}</td>}
                      {visibleColumnIds.has("broken") && <td className="px-3 py-2 font-mono text-danger">{nrt.test_run.broken_scenario}</td>}
                      {visibleColumnIds.has("skipped") && <td className="px-3 py-2 font-mono text-text-muted">{nrt.test_run.skipped_scenario}</td>}
                      {visibleColumnIds.has("passRate") && <td className={`px-3 py-2 font-mono font-semibold ${calculatePassRateColor(passRate)}`}>
                        {passRate.toFixed(2)}%
                      </td>}
                      {visibleColumnIds.has("trigger") && <td className="px-3 py-2 text-text-muted">{nrt.test_run.trigger_type}</td>}
                      {visibleColumnIds.has("origin") && <td className="px-3 py-2 text-text-muted">{nrt.test_run.test_origin ?? "—"}</td>}
                      {visibleColumnIds.has("productIssueStatus") && <td className="py-2 text-text-muted">
                         <div className="flex justify-center"><Chip variant="issueStatus" value={nrt.test_run.product_issue_status ?? ""} /></div>
                      </td>}
                      {visibleColumnIds.has("qaIssueStatus") && <td className="py-2 text-text-muted">
                         <div className="flex justify-center"><Chip variant="issueStatus" value={nrt.test_run.qa_issue_status ?? ""} /></div>
                      </td>}
                      {visibleColumnIds.has("result") && <td><select
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
                    </select></td>}
                      {visibleColumnIds.has("revision") && <td className="px-3 py-2 text-text-muted">{nrt.test_run.revisioned ? <Check className="text-success" size={16} /> : <X className="text-danger" size={16} />}</td>}
                    </tr>
                    {isSelected && (
                      <tr className="border-b border-border bg-subtle">
                        <td colSpan={visibleColumns.length} className="p-4">
                          <NrtDetailsPanel
                            details={nrt}
                            isLoading={isDetailsLoading}
                            hasError={hasDetailsError}
                            modified={modified}
                            onModifiedChange={onModifiedChange}
                            onSave={() => handleSave()}
                            isSaving={updateNrt.isPending}
                            hasSaveError={updateNrt.isError}
                            flakyScenarios={flakyToUse}
                            setFlakyScenarios={setFlakyScenarios}
                            fetchJiraIssue={handleJiraIssueBlur}
                            handleIssueInputChange={handleIssueInputChange}
                            handleRevisionNoteChange={handleScenarioRevisionNoteChange}
                            isTasOnly={isTasOnly}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </TooltipProvider>
          </div>

          <NrtPagination page={page} totalPages={totalPages} setPage={setPage} />
        </>
        );
  }
