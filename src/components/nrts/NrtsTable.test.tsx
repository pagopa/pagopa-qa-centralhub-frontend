import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NrtsListObject } from "@/types";
import NrtsTable from "./NrtsTable";

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "me@x.it" } } }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useJira", () => ({ useJiraIssue: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/hooks/useNrts", () => ({
  useUpdateNrt: () => ({ mutate: mocks.updateMutate, isError: false, isPending: false }),
  useSaveFlakyScenarios: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useQualityGate", () => ({
  useQualityGateRunScenarios: () => ({ data: undefined, isLoading: true, isError: false }),
  useDeleteQualityGateRun: () => ({
    mutate: mocks.deleteMutate,
    reset: vi.fn(),
    isError: false,
    isPending: false,
  }),
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

function renderTable(origin: "TAS" | "QG", runs: NrtsListObject[] = [makeRun()]) {
  const onNrtsChange = vi.fn();
  const onRowClick = vi.fn();
  render(
    <NrtsTable
      runs={runs}
      onNrtsChange={onNrtsChange}
      totalPages={1}
      onRowClick={onRowClick}
      onModifiedChange={vi.fn()}
      page={1}
      setPage={vi.fn()}
      isTasOnly
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

  it("offers Allure, AI Analysis and report icons on every Quality Gate row", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG");
    expect(screen.getByRole("link", { name: /report Allure di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /AI Analysis di checkout/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /report Quality Gate di checkout/ })).toBeInTheDocument();
  });

  it("opens the Quality Gate report popup from the row icon", async () => {
    const { onRowClick } = renderTable("QG");
    await userEvent.click(screen.getByRole("button", { name: /report Quality Gate di checkout/ }));
    expect(onRowClick).not.toHaveBeenCalled();
    expect(await screen.findByText("Caricamento del report…")).toBeInTheDocument();
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

  it("hides the delete icon without the run:qg permission and on the TAS list", () => {
    mocks.can.mockReturnValue(false);
    renderTable("QG");
    expect(screen.queryByRole("button", { name: /Elimina la run/ })).not.toBeInTheDocument();
  });

  it("never offers deletion on the TAS list", () => {
    renderTable("TAS");
    expect(screen.queryByRole("button", { name: /Elimina la run/ })).not.toBeInTheDocument();
  });
});
