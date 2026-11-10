import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TasReportPage from "./page";

const mocks = vi.hoisted(() => ({ can: vi.fn(), run: vi.fn() }));

vi.mock("next/navigation", () => ({ useParams: () => ({ runId: "run-1" }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useQualityGate", () => ({
  useRunReport: (...args: unknown[]) => mocks.run(...args),
  useRunReportScenarios: () => ({ data: [], isLoading: false, isError: false }),
}));

const run = {
  test_suite: { id: "s", test_object: "checkout", test_type: "e2e", test_object_version: "1", owner_team: null },
  test_run: {
    id: "run-1", suite_id: "s", scenario_qty: 0, passed_scenario: 0, failed_scenario: 0, broken_scenario: 0,
    skipped_scenario: 0, timestamp_start: "2026-11-09T10:00:00", timestamp_end: "2026-11-09T10:05:00",
    duration_ms: 1, env: "UAT", trigger_type: "MANUAL", test_version: "1", test_origin: "TAS",
    revision_result: "OK",
  },
};

describe("TasReportPage", () => {
  beforeEach(() => {
    mocks.run.mockReturnValue({ data: run, isLoading: false, isError: false });
  });

  it("renders the report and a way back to the list for roles that can see the list", () => {
    mocks.can.mockImplementation((action: string) => action === "view:tas_nrts");
    render(<TasReportPage />);
    expect(mocks.run).toHaveBeenCalledWith("tas", "run-1");
    expect(screen.getByRole("link", { name: /Torna alla lista/ })).toHaveAttribute("href", "/tas-nrts");
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("shows the report to a guest without the link back to the list", () => {
    mocks.can.mockReturnValue(false);
    render(<TasReportPage />);
    expect(screen.queryByRole("link", { name: /Torna alla lista/ })).not.toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("shows an error when the run does not exist", () => {
    mocks.run.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    mocks.can.mockReturnValue(false);
    render(<TasReportPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Report non trovato");
  });
});
