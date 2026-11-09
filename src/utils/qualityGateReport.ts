import type { NrtsListObject } from "@/types";
import type { QualityGateScenario } from "@/hooks/useQualityGate";
import { calculatePassRate, formatNrtDuration, formatNrtTimestamp } from "@/utils/nrtUtils";

/** What the report needs of a run: the run itself and its suite. */
export type QualityGateRunDetail = Pick<NrtsListObject, "test_run" | "test_suite">;

export type QualityGateOutcome = "GO" | "NOGO" | "PENDING";

export interface QualityGateReportData {
  suite: string;
  testType: string;
  testObjectVersion: string;
  testSuiteVersion: string;
  environment: string;
  start: string;
  end: string;
  duration: string;
  outcome: QualityGateOutcome;
  reviewer: string;
  ghaRunUrl: string | null;
  allureUrl: string | null;
  totals: { total: number; passed: number; failed: number; broken: number; skipped: number };
  passRate: number;
  koScenarios: QualityGateScenario[];
  okScenarios: QualityGateScenario[];
  skippedScenarios: QualityGateScenario[];
}

const OUTCOME_BY_REVISION_RESULT: Record<string, QualityGateOutcome> = {
  OK: "GO",
  KO: "NOGO",
  PENDING: "PENDING",
};

const dash = "—";

/** Builds everything the on-screen report and the PDF show, from the table row and its scenarios. */
export function buildQualityGateReportData(
  run: QualityGateRunDetail,
  scenarios: QualityGateScenario[],
): QualityGateReportData {
  const { test_run: testRun, test_suite: suite } = run;
  const byStatus = (...statuses: string[]) =>
    scenarios.filter((s) => statuses.includes((s.status ?? "").toUpperCase()));

  return {
    suite: suite.test_object.toUpperCase(),
    testType: suite.test_type || dash,
    testObjectVersion: suite.test_object_version || dash,
    testSuiteVersion: testRun.test_version || dash,
    environment: testRun.env || dash,
    start: formatNrtTimestamp(testRun.timestamp_start?.replace("T", " ")) ?? dash,
    end: formatNrtTimestamp(testRun.timestamp_end?.replace("T", " ")) ?? dash,
    duration: formatNrtDuration(testRun.duration_ms ?? null) ?? dash,
    outcome: OUTCOME_BY_REVISION_RESULT[testRun.revision_result ?? ""] ?? "PENDING",
    reviewer: testRun.revisioned_by || "-",
    ghaRunUrl: testRun.gha_run_url ?? null,
    allureUrl: testRun.allure_url ?? null,
    totals: {
      total: testRun.scenario_qty ?? 0,
      passed: testRun.passed_scenario ?? 0,
      failed: testRun.failed_scenario ?? 0,
      broken: testRun.broken_scenario ?? 0,
      skipped: testRun.skipped_scenario ?? 0,
    },
    passRate: calculatePassRate(testRun),
    koScenarios: byStatus("FAILED", "BROKEN"),
    okScenarios: byStatus("PASSED"),
    skippedScenarios: byStatus("SKIPPED"),
  };
}

/** File name of the downloaded PDF, e.g. quality-gate-checkout-2026-11-09.pdf. */
export function qualityGateReportFileName(data: Pick<QualityGateReportData, "suite" | "start">): string {
  const day = /(\d{2})\/(\d{2})\/(\d{4})/.exec(data.start);
  const date = day ? `${day[3]}-${day[2]}-${day[1]}` : "report";
  return `quality-gate-${data.suite.toLowerCase()}-${date}.pdf`;
}

/** Last numeric segment of a GitHub Actions run URL, for display (e.g. "#123456"). */
export function ghaRunId(url: string | null | undefined): string | null {
  const match = url ? /\/runs\/(\d+)/.exec(url) : null;
  return match ? match[1] : null;
}
