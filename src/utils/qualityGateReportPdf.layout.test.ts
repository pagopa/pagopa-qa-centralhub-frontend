import { describe, expect, it, vi } from "vitest";
import type { NrtsListObject } from "@/types";
import type { QualityGateScenario } from "@/hooks/useQualityGate";
import { buildQualityGateReportData } from "./qualityGateReport";
import { buildQualityGateReportPdf } from "./qualityGateReportPdf";

// Records every text() call (text, x, y) so the layout can be checked without rendering the PDF.
const textCalls = vi.hoisted(() => [] as Array<[unknown, number, number]>);

vi.mock("jspdf", async (importOriginal) => {
  const original = await importOriginal<typeof import("jspdf")>();
  class RecordingJsPdf extends original.jsPDF {
    constructor(...args: ConstructorParameters<typeof original.jsPDF>) {
      super(...args);
      const text = this.text.bind(this);
      (this as unknown as { text: (...a: unknown[]) => unknown }).text = (...a: unknown[]) => {
        textCalls.push([a[0], a[1] as number, a[2] as number]);
        return (text as (...b: unknown[]) => unknown)(...a);
      };
    }
  }
  return { ...original, jsPDF: RecordingJsPdf };
});

const run: NrtsListObject = {
  test_suite: { id: "s", test_object: "checkout", test_type: "e2e", test_object_version: "1", owner_team: null },
  test_run: {
    id: "r",
    suite_id: "s",
    scenario_qty: 10,
    passed_scenario: 0,
    failed_scenario: 10,
    broken_scenario: 0,
    skipped_scenario: 0,
    timestamp_start: "2026-11-09 10:00:00",
    timestamp_end: "2026-11-09 10:05:00",
    duration_ms: 1000,
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

function failing(id: number): QualityGateScenario {
  return { id: String(id), scenario_name: `ko ${id}`, status: "FAILED", duration_ms: 1, retries: 0, error_message: "boom", allure_url: null };
}

describe("PDF section headings near the page bottom", () => {
  it("never draws the next section heading or empty message over the footer", async () => {
    // Sweep the number of KO rows so that, for some counts, the KO table ends close to the bottom.
    for (let koCount = 5; koCount <= 40; koCount += 1) {
      textCalls.length = 0;
      const ko = Array.from({ length: koCount }, (_, i) => failing(i));
      const doc = await buildQualityGateReportPdf(buildQualityGateReportData(run, ko));
      const pageHeight = doc.internal.pageSize.getHeight();
      const sections = textCalls.filter(
        ([text]) => typeof text === "string" && (text.startsWith("SCENARI OK") || text.startsWith("Nessuno scenario passato")),
      );
      expect(sections.length).toBe(2);
      for (const [, , y] of sections) {
        // The baseline must stay above the footer area (16 mm from the bottom).
        expect(y).toBeLessThan(pageHeight - 16);
      }
    }
  });
});
