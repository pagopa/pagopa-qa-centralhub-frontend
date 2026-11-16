import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestMarkers } from "@/components/release-status/TestMarkers";
import type { RunRef } from "@/types/release-status";

function makeRun(overrides: Partial<RunRef> = {}): RunRef {
  return {
    run_id: "run-1",
    kind: "NRT",
    outcome: "PASSED",
    needs_review: false,
    trigger_type: "schedule",
    timestamp_start: "2026-11-16T09:00:00Z",
    passed: 10,
    failed: 0,
    allure_url: null,
    gha_run_url: null,
    hub_url: "/nrts/report/run-1",
    ...overrides,
  };
}

describe("TestMarkers", () => {
  it("renders one icon per run kind with an accessible outcome", () => {
    render(
      <TestMarkers
        hasTestObject
        tests={[
          makeRun({ kind: "NRT", outcome: "PASSED" }),
          makeRun({ run_id: "run-2", kind: "TAS", outcome: "FAILED", hub_url: "/tas-nrts/report/run-2" }),
        ]}
      />,
    );

    const icons = screen.getAllByRole("img");
    expect(icons).toHaveLength(2);
    expect(screen.getByRole("img", { name: "NRT: superata" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "TAS: fallita" })).toBeInTheDocument();
  });

  it("flags runs that still need a review", () => {
    render(<TestMarkers hasTestObject tests={[makeRun({ kind: "QG", needs_review: true })]} />);

    expect(screen.getByRole("img", { name: /QG: superata.*da revisionare/ })).toBeInTheDocument();
  });

  it("shows a single muted marker when the version has no runs", () => {
    render(<TestMarkers hasTestObject tests={[]} />);

    expect(screen.getByRole("img", { name: "non testata" })).toBeInTheDocument();
  });

  it("renders nothing for applications without a test object", () => {
    const { container } = render(<TestMarkers hasTestObject={false} tests={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
