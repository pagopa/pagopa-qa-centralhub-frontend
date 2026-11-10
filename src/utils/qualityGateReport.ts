import type { NrtsListObject } from "@/types";
import type { QualityGateScenario } from "@/hooks/useQualityGate";
import { calculatePassRate, formatNrtDuration, formatNrtTimestamp } from "@/utils/nrtUtils";

/** What the report needs of a run: the run itself and its suite. */
export type QualityGateRunDetail = Pick<NrtsListObject, "test_run" | "test_suite">;

export type QualityGateOutcome = "GO" | "NOGO" | "PENDING";

/** Which run report this is: Quality Gate, TAS or NRT (same content, other labels). */
export type RunReportKind = "qg" | "tas" | "nrt";

/** Title, PDF file prefix and the way the outcome is written, for each kind of report. */
export const RUN_REPORT_LABELS: Record<
  RunReportKind,
  { title: string; filePrefix: string; outcome: Record<QualityGateOutcome, string> }
> = {
  qg: { title: "Quality Gate report", filePrefix: "quality-gate", outcome: { GO: "GO", NOGO: "NOGO", PENDING: "PENDING" } },
  // A TAS run has no go/no-go decision: its outcome is the revision result.
  tas: { title: "TAS report", filePrefix: "tas", outcome: { GO: "OK", NOGO: "KO", PENDING: "PENDING" } },
  nrt: { title: "NRT report", filePrefix: "nrt", outcome: { GO: "OK", NOGO: "KO", PENDING: "PENDING" } },
};

export interface QualityGateReportData {
  kind: RunReportKind;
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
  kind: RunReportKind = "qg",
): QualityGateReportData {
  const { test_run: testRun, test_suite: suite } = run;
  const byStatus = (...statuses: string[]) =>
    scenarios.filter((s) => statuses.includes((s.status ?? "").toUpperCase()));

  return {
    kind,
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

/** File name of the downloaded PDF, e.g. quality-gate-checkout-2026-11-09.pdf (tas-… for TAS). */
export function qualityGateReportFileName(
  data: Pick<QualityGateReportData, "suite" | "start"> & { kind?: RunReportKind },
): string {
  const day = /(\d{2})\/(\d{2})\/(\d{4})/.exec(data.start);
  const date = day ? `${day[3]}-${day[2]}-${day[1]}` : "report";
  return `${RUN_REPORT_LABELS[data.kind ?? "qg"].filePrefix}-${data.suite.toLowerCase()}-${date}.pdf`;
}

/** Last numeric segment of a GitHub Actions run URL, for display (e.g. "#123456"). */
export function ghaRunId(url: string | null | undefined): string | null {
  const match = url ? /\/runs\/(\d+)/.exec(url) : null;
  return match ? match[1] : null;
}
