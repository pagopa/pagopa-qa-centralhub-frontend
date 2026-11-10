import { describe, expect, it } from "vitest";
import type { NrtsListObject } from "@/types";
import type { QualityGateScenario } from "@/hooks/useQualityGate";
import {
  buildQualityGateReportData,
  ghaRunId,
  qualityGateReportFileName,
} from "./qualityGateReport";
import { buildQualityGateReportPdf } from "./qualityGateReportPdf";

const run: NrtsListObject = {
  test_suite: { id: "s", test_object: "checkout", test_type: "e2e", test_object_version: "0.0.1", owner_team: null },
  test_run: {
    id: "r1",
    suite_id: "s",
    scenario_qty: 5,
    passed_scenario: 2,
    failed_scenario: 1,
    broken_scenario: 1,
    skipped_scenario: 1,
    timestamp_start: "2026-11-09 10:24:36",
    timestamp_end: "2026-11-09 10:31:02",
    duration_ms: 386_000,
    env: "UAT",
    trigger_type: "MANUAL",
    test_version: "1.4.0",
    test_origin: "QG",
    revision_result: "KO",
    revisioned_by: "me@x.it",
    allure_url: "https://allure/x",
    gha_run_url: "https://github.com/o/r/actions/runs/123456",
    product_issue: null,
    product_issue_status: null,
    qa_issue: null,
    qa_issue_status: null,
  },
  test_execution: [],
};

function scenario(id: string, status: string): QualityGateScenario {
  return { id, scenario_name: `scenario ${id}`, status, duration_ms: 10, retries: 0, error_message: status === "PASSED" ? null : "boom", allure_url: null };
}

const scenarios = [
  scenario("a", "PASSED"),
  scenario("b", "PASSED"),
  scenario("c", "FAILED"),
  scenario("d", "BROKEN"),
  scenario("e", "SKIPPED"),
];

describe("buildQualityGateReportData", () => {
  it("splits scenarios into KO, OK and skipped", () => {
    const data = buildQualityGateReportData(run, scenarios);
    expect(data.koScenarios.map((s) => s.id)).toEqual(["c", "d"]);
    expect(data.okScenarios.map((s) => s.id)).toEqual(["a", "b"]);
    expect(data.skippedScenarios.map((s) => s.id)).toEqual(["e"]);
  });

  it("maps the persisted result to GO / NOGO / PENDING", () => {
    const outcome = (result: string | undefined) =>
      buildQualityGateReportData({ ...run, test_run: { ...run.test_run, revision_result: result } }, []).outcome;
    expect(outcome("OK")).toBe("GO");
    expect(outcome("KO")).toBe("NOGO");
    expect(outcome("PENDING")).toBe("PENDING");
    expect(outcome(undefined)).toBe("PENDING");
  });

  it("collects the summary shown in the table and in the detail", () => {
    const data = buildQualityGateReportData(run, scenarios);
    expect(data).toMatchObject({
      suite: "CHECKOUT",
      testType: "e2e",
      testObjectVersion: "0.0.1",
      testSuiteVersion: "1.4.0",
      environment: "UAT",
      reviewer: "me@x.it",
      duration: "6m 26s",
      ghaRunUrl: "https://github.com/o/r/actions/runs/123456",
    });
    expect(data.passRate).toBe(40);
  });

  it("shows a dash when nobody reviewed the run", () => {
    const data = buildQualityGateReportData({ ...run, test_run: { ...run.test_run, revisioned_by: null } }, []);
    expect(data.reviewer).toBe("-");
  });
});

describe("report helpers", () => {
  it("extracts the GitHub run id", () => {
    expect(ghaRunId("https://github.com/o/r/actions/runs/123456")).toBe("123456");
    expect(ghaRunId(null)).toBeNull();
  });

  it("builds a dated file name", () => {
    const data = buildQualityGateReportData(run, []);
    expect(qualityGateReportFileName(data)).toBe("quality-gate-checkout-2026-11-09.pdf");
    expect(qualityGateReportFileName({ ...data, kind: "tas" })).toBe("tas-checkout-2026-11-09.pdf");
  });
});

describe("buildQualityGateReportPdf", () => {
  it("generates a PDF with every section, also for long scenario lists", async () => {
    const many = Array.from({ length: 120 }, (_, i) => scenario(`p${i}`, "PASSED"));
    const doc = await buildQualityGateReportPdf(buildQualityGateReportData(run, [...many, ...scenarios]));
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const bytes = doc.output("arraybuffer");
    expect(new TextDecoder().decode(new Uint8Array(bytes).slice(0, 5))).toBe("%PDF-");
  });

  it("generates a PDF when there are no KO scenarios", async () => {
    const doc = await buildQualityGateReportPdf(buildQualityGateReportData(run, [scenario("a", "PASSED")]));
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
