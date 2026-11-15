import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FlakyScenarioRow } from "@/types/flaky";
import { FlakyTable } from "./FlakyTable";

function row(overrides: Partial<FlakyScenarioRow> = {}): FlakyScenarioRow {
  return {
    test_object: "checkout",
    test_type: "e2e",
    scenario_name: "Pay with card",
    env: "UAT",
    score: 68,
    level: 5,
    state: "OK",
    flip_rate: 0.54,
    retry_pass_rate: 0.25,
    runs_analyzed: 28,
    last_failure_at: "2026-11-13T10:00:00Z",
    recent_outcomes: [],
    last_suite_id: "s1",
    is_flaky: false,
    flagged_by: null,
    flagged_at: null,
    hint: "to_mark",
    ...overrides,
  };
}

describe("FlakyTable", () => {
  it("renders the scenario, rates and hint chip with the row highlight", () => {
    render(<FlakyTable rows={[row()]} canManage onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    const tr = screen.getByRole("row", { name: /Pay with card/ });
    expect(tr).toHaveAttribute("data-hint", "to_mark");
    expect(within(tr).getByText("checkout · e2e")).toBeInTheDocument();
    expect(within(tr).getByText("54%")).toBeInTheDocument();
    expect(within(tr).getByText("25%")).toBeInTheDocument();
    expect(within(tr).getByText("28")).toBeInTheDocument();
    expect(within(tr).getByText("13/11/2026")).toBeInTheDocument();
    expect(within(tr).getByText("Da marcare")).toBeInTheDocument();
  });

  it.each([
    ["to_unmark", "Da smarcare"],
    ["broken", "Rotto: apri bug"],
  ] as const)("shows the %s hint chip", (hint, label) => {
    render(<FlakyTable rows={[row({ hint })]} canManage onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows who flagged a scenario", () => {
    render(<FlakyTable rows={[row({ is_flaky: true, flagged_by: "m.rossi@x.it", flagged_at: "2026-10-02T09:00:00Z", hint: null })]} canManage onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByText("m.rossi@x.it · 02/10/2026")).toBeInTheDocument();
  });

  it("toggles the flag without opening the row", async () => {
    const onToggleFlag = vi.fn();
    const onRowClick = vi.fn();
    render(<FlakyTable rows={[row()]} canManage onToggleFlag={onToggleFlag} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByRole("switch", { name: "Flaky: Pay with card" }));
    expect(onToggleFlag).toHaveBeenCalledWith(expect.objectContaining({ scenario_name: "Pay with card" }), true);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("makes the flag read-only without manage:flaky", () => {
    render(<FlakyTable rows={[row()]} canManage={false} onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Flaky: Pay with card" })).toBeDisabled();
  });

  it("opens the row details on click", async () => {
    const onRowClick = vi.fn();
    render(<FlakyTable rows={[row()]} canManage onToggleFlag={vi.fn()} onRowClick={onRowClick} />);
    await userEvent.click(screen.getByText("Pay with card"));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ scenario_name: "Pay with card" }));
  });

  it("shows dashes for missing rates and an empty message", () => {
    const { rerender } = render(<FlakyTable rows={[row({ flip_rate: null, retry_pass_rate: null, last_failure_at: null })]} canManage onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    rerender(<FlakyTable rows={[]} canManage onToggleFlag={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByText("Nessuno scenario per i filtri selezionati")).toBeInTheDocument();
  });
});
