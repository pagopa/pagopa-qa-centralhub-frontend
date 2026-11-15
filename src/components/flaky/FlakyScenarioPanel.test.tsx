import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlakyScenarioRow } from "@/types/flaky";
import { FlakyScenarioPanel } from "./FlakyScenarioPanel";

const hooks = vi.hoisted(() => ({ history: vi.fn() }));
vi.mock("@/hooks/useFlaky", () => ({ useFlakyHistory: hooks.history }));

const row: FlakyScenarioRow = {
  test_object: "checkout", test_type: "e2e", scenario_name: "Pay with card", env: "UAT",
  score: 68, level: 5, state: "OK", flip_rate: 0.54, retry_pass_rate: 0.25, runs_analyzed: 28,
  last_failure_at: null, recent_outcomes: [], last_suite_id: "s1", is_flaky: true,
  flagged_by: "m.rossi@x.it", flagged_at: "2026-10-02T09:00:00Z", hint: null,
};

describe("FlakyScenarioPanel", () => {
  beforeEach(() => {
    hooks.history.mockReset();
    hooks.history.mockReturnValue({
      isLoading: false,
      data: [{
        run_id: "run-9", ts: "2026-11-13T10:00:00Z", outcome: "F", status: "BROKEN", retries: 1,
        error_message: "Timeout waiting for 3DS", allure_url: "https://allure/x#s", test_version: "1.4.0",
        test_object_version: "2.0.0", test_origin: "NRT",
      }, {
        run_id: "run-8", ts: "2026-11-12T10:00:00Z", outcome: "P", status: "PASSED", retries: 0,
        error_message: null, allure_url: null, test_version: "1.4.0", test_object_version: "2.0.0", test_origin: "TAS",
      }],
    });
  });

  it("is closed without a selected row", () => {
    render(<FlakyScenarioPanel row={null} canManage onClose={vi.fn()} onToggleFlag={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(hooks.history).toHaveBeenCalledWith(null);
  });

  it("loads the history of the selected scenario in its environment", () => {
    render(<FlakyScenarioPanel row={row} canManage onClose={vi.fn()} onToggleFlag={vi.fn()} />);
    expect(hooks.history).toHaveBeenCalledWith({ env: "UAT", test_object: "checkout", test_type: "e2e", scenario_name: "Pay with card" });
    const dialog = screen.getByRole("dialog", { name: "Dettaglio Pay with card" });
    expect(within(dialog).getByText("54%")).toBeInTheDocument();
    const [item, tasItem] = within(dialog).getAllByRole("listitem");
    expect(within(tasItem).getByRole("link", { name: "Run" })).toHaveAttribute("href", "/tas-nrts/report/run-8");
    expect(within(tasItem).queryByRole("link", { name: "Allure" })).not.toBeInTheDocument();
    expect(item).toHaveTextContent("13/11/2026");
    expect(item).toHaveTextContent("BROKEN");
    expect(item).toHaveTextContent("retry 1");
    expect(item).toHaveTextContent("test 1.4.0");
    expect(item).toHaveTextContent("Timeout waiting for 3DS");
    expect(within(item).getByRole("link", { name: "Allure" })).toHaveAttribute("href", "https://allure/x#s");
    expect(within(item).getByRole("link", { name: "Run" })).toHaveAttribute("href", "/nrts/report/run-9");
  });

  it("toggles the flag and closes", async () => {
    const onToggleFlag = vi.fn();
    const onClose = vi.fn();
    render(<FlakyScenarioPanel row={row} canManage onClose={onClose} onToggleFlag={onToggleFlag} />);
    await userEvent.click(screen.getByRole("switch", { name: "Flaky: Pay with card" }));
    expect(onToggleFlag).toHaveBeenCalledWith(row, false);
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables the flag for read-only roles", () => {
    render(<FlakyScenarioPanel row={row} canManage={false} onClose={vi.fn()} onToggleFlag={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Flaky: Pay with card" })).toBeDisabled();
  });
});
