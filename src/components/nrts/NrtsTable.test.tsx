import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NrtsListObject } from "@/types";
import NrtsTable from "./NrtsTable";

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  deleteHookArgs: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "me@x.it" } } }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useJira", () => ({ useJiraIssue: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/hooks/useNrts", () => ({
  useUpdateNrt: () => ({ mutate: mocks.updateMutate, isError: false, isPending: false }),
  useSaveFlakyScenarios: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useQualityGate", () => ({
  useDeleteRun: (...args: unknown[]) => {
    mocks.deleteHookArgs(...args);
    return { mutate: mocks.deleteMutate, reset: vi.fn(), isError: false, isPending: false };
  },
}));

function makeRun(overrides: Partial<NrtsListObject["test_run"]> = {}): NrtsListObject {
  return {
    test_suite: { id: "s1", test_object: "checkout", test_type: "e2e", test_object_version: "1", owner_team: null },
    test_run: {
      id: "run-1",
      suite_id: "s1",
      scenario_qty: 10,
      passed_scenario: 10,
      failed_scenario: 0,
      broken_scenario: 0,
      skipped_scenario: 0,
      timestamp_start: "2026-11-03 10:00:00",
      timestamp_end: "2026-11-03 10:05:00",
      duration_ms: 1000,
      env: "UAT",
      trigger_type: "MANUAL",
      test_version: "1",
      test_origin: "QG",
      revision_result: "OK",
      allure_url: null,
      product_issue: null,
      product_issue_status: null,
      qa_issue: null,
      qa_issue_status: null,
      ...overrides,
    },
    test_execution: [],
  };
}

function renderTable(origin: "TAS" | "QG" | "NRT", runs: NrtsListObject[] = [makeRun()], isTasOnly = true, selectedNrt?: string) {
  const onNrtsChange = vi.fn();
  const onRowClick = vi.fn();
  render(
    <NrtsTable
      runs={runs}
      onNrtsChange={onNrtsChange}
      totalPages={1}
      onRowClick={onRowClick}
      selectedNrt={selectedNrt}
      onModifiedChange={vi.fn()}
      page={1}
      setPage={vi.fn()}
      isTasOnly={isTasOnly}
      origin={origin}
      flakyScenariosData={[]}
    />,
  );
  return { onNrtsChange, onRowClick };
}

describe("NrtsTable (Quality Gate)", () => {
  beforeEach(() => {
    mocks.can.mockReset().mockReturnValue(true);
    mocks.updateMutate.mockReset();
    mocks.deleteMutate.mockReset();
    mocks.deleteHookArgs.mockReset();
  });

  it("lists the Quality Gate columns in the requested order", () => {
    renderTable("QG");
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent)
      .filter(Boolean);
    expect(headers).toEqual([
      "Suite",
      "Tipologia",
      "Inizio",
      "Fine",
      "Ver. test object",
      "Totale",
      "Passed",
      "Failed",
      "Broken",
      "Skipped",
      "Pass rate",
      "Esito",
      "Azioni",
    ]);
  });

  it("shows type, end time and test object version in the row", () => {
    renderTable("QG", [makeRun()]);
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("e2e")).toBeInTheDocument();
    expect(within(row).getByText("1")).toBeInTheDocument();
    // start (Inizio) and end (Fine) are both rendered
    expect(within(row).getAllByText(/03\/11\/2026/)).toHaveLength(2);
  });

  it("offers Allure, AI Analysis and report icons on a Quality Gate row with failures", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG", [makeRun({ passed_scenario: 9, failed_scenario: 1 })]);
    expect(screen.getByRole("link", { name: /report Allure di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Analysis di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /report Quality Gate di checkout/ })).toBeInTheDocument();
  });

  it("hides the AI Analysis icon when the run has no failing scenarios", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG");
    expect(screen.queryByRole("link", { name: /AI Analysis di checkout/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /report Allure di checkout/ })).toBeInTheDocument();
  });

  it("counts broken and skipped scenarios as failures for the AI Analysis icon", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG", [makeRun({ passed_scenario: 8, broken_scenario: 1, skipped_scenario: 1 })]);
    expect(screen.getByRole("link", { name: /AI Analysis di checkout/ })).toBeInTheDocument();
  });

  it("links the report icon to the shareable report page without selecting the row", async () => {
    const { onRowClick } = renderTable("QG");
    const link = screen.getByRole("link", { name: /report Quality Gate di checkout/ });
    expect(link).toHaveAttribute("href", "/quality-gate/report/run-1");
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("gives the TAS and NRT lists the same actions as the Quality Gate, with their own report", () => {
    mocks.can.mockReturnValue(false);
    renderTable("TAS", [makeRun({ test_origin: "TAS", passed_scenario: 9, failed_scenario: 1 })]);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toContain("Azioni");
    expect(screen.getByRole("link", { name: /report Allure di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Analysis di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /report TAS di checkout/ })).toHaveAttribute("href", "/tas-nrts/report/run-1");
    // Deleting stays a Quality Gate action.
    expect(screen.queryByRole("button", { name: /Elimina la run/ })).not.toBeInTheDocument();
  });

  it("links an NRT row to the NRT report", () => {
    mocks.can.mockReturnValue(false);
    renderTable("TAS", [makeRun({ test_origin: "GHA" })], false);
    expect(screen.getByRole("link", { name: /report NRT di checkout/ })).toHaveAttribute("href", "/nrts/report/run-1");
  });

  it("keeps trigger and origin on the TAS list without the outcome", () => {
    renderTable("TAS");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).not.toContain("Tipologia");
    expect(headers).toContain("Trigger");
    expect(headers).toContain("Origine");
    expect(headers).not.toContain("Esito");
  });

  it("labels the outcome GO / NOGO / PENDING", () => {
    renderTable("QG");
    const options = within(screen.getByRole("combobox")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["GO", "NOGO", "PENDING"]);
    expect(screen.getByRole("combobox")).toHaveValue("OK");
  });

  it("persists the outcome as soon as it changes", async () => {
    renderTable("QG", [makeRun({ revision_result: "PENDING", passed_scenario: 8, failed_scenario: 2 })]);
    await userEvent.selectOptions(screen.getByRole("combobox"), "NOGO");
    expect(mocks.updateMutate).toHaveBeenCalledTimes(1);
    const payload = mocks.updateMutate.mock.calls[0][0];
    expect(payload.test_runs[0]).toMatchObject({ id: "run-1", revision_result: "KO", revisioned_by: "me@x.it" });
  });

  it("asks for confirmation before deleting a run", async () => {
    const { onRowClick } = renderTable("QG");
    await userEvent.click(screen.getByRole("button", { name: /Elimina la run checkout/ }));
    expect(onRowClick).not.toHaveBeenCalled();
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
    expect(await screen.findByText("Eliminare la run?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(mocks.deleteMutate.mock.calls[0][0]).toBe("run-1");
  });

  it("does not delete when the user cancels", async () => {
    renderTable("QG");
    await userEvent.click(screen.getByRole("button", { name: /Elimina la run checkout/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Annulla" }));
    expect(mocks.deleteMutate).not.toHaveBeenCalled();
  });

  it("hides the delete icon without the run:qg permission", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG");
    expect(screen.queryByRole("button", { name: /Elimina la run/ })).not.toBeInTheDocument();
  });

  it.each([
    ["QG", "run:qg", true],
    ["TAS", "run:tas", true],
    ["NRT", "run:nrt", false],
  ] as const)("offers deletion on the %s list only with %s", async (origin, action, isTasOnly) => {
    mocks.can.mockImplementation((a: string) => a === action);
    renderTable(origin, [makeRun({ test_origin: origin === "NRT" ? "GHA" : origin })], isTasOnly);
    expect(mocks.deleteHookArgs).toHaveBeenCalledWith(origin);
    await userEvent.click(screen.getByRole("button", { name: /Elimina la run checkout/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Elimina" }));
    expect(mocks.deleteMutate.mock.calls[0][0]).toBe("run-1");
  });

  it.each([
    ["QG", "run:tas", true],
    ["TAS", "run:qg", true],
    ["TAS", "run:nrt", true],
    ["NRT", "run:tas", false],
    ["NRT", "run:qg", false],
  ] as const)("hides deletion on the %s list when only %s is granted", (origin, action, isTasOnly) => {
    mocks.can.mockImplementation((a: string) => a === action);
    renderTable(origin, [makeRun()], isTasOnly);
    expect(screen.queryByRole("button", { name: /Elimina la run/ })).not.toBeInTheDocument();
  });

  it("closes the details of the deleted run and refreshes the list once the delete succeeds", async () => {
    mocks.deleteMutate.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess());
    const { onRowClick, onNrtsChange } = renderTable("TAS", [makeRun()], true);
    await userEvent.click(screen.getByRole("button", { name: /Elimina la run checkout/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Elimina" }));
    expect(onNrtsChange).toHaveBeenCalledWith([]);
    expect(screen.queryByText("Eliminare la run?")).not.toBeInTheDocument();
    // The details are closed through onRowClick only when the deleted run was the selected one.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("closes the details when the deleted run was the open one", async () => {
    mocks.deleteMutate.mockImplementation((_id: string, options: { onSuccess: () => void }) => options.onSuccess());
    const { onRowClick } = renderTable("NRT", [makeRun({ test_origin: "GHA" })], false, "run-1");
    await userEvent.click(screen.getByRole("button", { name: /Elimina la run checkout/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Elimina" }));
    expect(onRowClick).toHaveBeenCalledWith(undefined);
  });
});

describe("NrtsTable run note", () => {
  beforeEach(() => {
    mocks.can.mockReset().mockReturnValue(true);
    mocks.updateMutate.mockReset();
  });

  // The page keeps the edited rows in its state: the table only reports changes.
  function Harness() {
    const [runs, setRuns] = useState<NrtsListObject[]>([makeRun({ test_origin: "GHA", note: "old" })]);
    return (
      <NrtsTable
        runs={runs}
        onNrtsChange={(next) => { if (next.length > 0) setRuns(next); }}
        totalPages={1}
        selectedNrt="run-1"
        onModifiedChange={vi.fn()}
        modified
        page={1}
        setPage={vi.fn()}
        isTasOnly={false}
        origin="NRT"
        flakyScenariosData={[]}
      />
    );
  }

  it("saves the edited note with the run through the existing Save button", async () => {
    render(<Harness />);
    const note = screen.getByRole("textbox", { name: "Note della run" });
    expect(note).toHaveValue("old");
    fireEvent.change(note, { target: { value: "edited" } });
    expect(note).toHaveValue("edited");
    // The table and the open details each show a Save button: both run the same save.
    await userEvent.click(screen.getAllByRole("button", { name: "Salva modifiche" })[0]);
    expect(mocks.updateMutate).toHaveBeenCalledTimes(1);
    expect(mocks.updateMutate.mock.calls[0][0].test_runs[0]).toMatchObject({ id: "run-1", note: "edited", revisioned_by: "me@x.it" });
  });

  it("sends an empty note when the user clears it", async () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("textbox", { name: "Note della run" }), { target: { value: "" } });
    // The table and the open details each show a Save button: both run the same save.
    await userEvent.click(screen.getAllByRole("button", { name: "Salva modifiche" })[0]);
    expect(mocks.updateMutate.mock.calls[0][0].test_runs[0]).toMatchObject({ id: "run-1", note: "" });
  });
});
