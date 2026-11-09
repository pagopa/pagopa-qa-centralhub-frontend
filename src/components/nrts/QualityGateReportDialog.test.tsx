import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NrtsListObject } from "@/types";
import { QualityGateReportDialog } from "./QualityGateReportDialog";

const longName = "Scenario_" + "x".repeat(200);
const longError = "https://example.org/" + "y".repeat(200);

vi.mock("@/hooks/useQualityGate", () => ({
  useQualityGateRunScenarios: () => ({
    isLoading: false,
    isError: false,
    data: [
      { id: "1", scenario_name: longName, status: "FAILED", duration_ms: 1, retries: 0, error_message: longError, allure_url: null },
      { id: "2", scenario_name: "ok one", status: "PASSED", duration_ms: 2, retries: 0, error_message: null, allure_url: null },
    ],
  }),
}));

const run: NrtsListObject = {
  test_suite: { id: "s", test_object: "checkout", test_type: "e2e", test_object_version: "1", owner_team: null },
  test_run: {
    id: "r",
    suite_id: "s",
    scenario_qty: 2,
    passed_scenario: 1,
    failed_scenario: 1,
    broken_scenario: 0,
    skipped_scenario: 0,
    timestamp_start: "2026-11-09 10:00:00",
    timestamp_end: "2026-11-09 10:05:00",
    duration_ms: 300_000,
    env: "UAT",
    trigger_type: "MANUAL",
    test_version: "1",
    test_origin: "QG",
    revision_result: "PENDING",
    allure_url: null,
    product_issue: null,
    product_issue_status: null,
    qa_issue: null,
    qa_issue_status: null,
  },
  test_execution: [],
};

describe("QualityGateReportDialog", () => {
  it("lets long scenario names and errors wrap inside zero-minimum grid tracks", () => {
    render(<QualityGateReportDialog run={run} open onClose={() => {}} />);
    const name = screen.getByText(longName);
    const error = screen.getByText(longError);
    expect(name).toHaveClass("break-words");
    expect(error).toHaveClass("break-words");
    expect(name.parentElement?.className).toContain("minmax(0,2fr)");
    expect(name.parentElement?.className).toContain("minmax(0,3fr)");
  });

  it("shows the KO and OK sections with the outcome", () => {
    render(<QualityGateReportDialog run={run} open onClose={() => {}} />);
    expect(screen.getByRole("region", { name: "Scenari KO" })).toHaveTextContent("(1)");
    expect(screen.getByRole("region", { name: "Scenari OK" })).toHaveTextContent("ok one");
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });
});
