import { describe, expect, it } from "vitest";
import type { TestRun } from "@/types";
import { buildAiAnalysisUrl, buildAllureRunUrl } from "./nrtUtils";

const run = {
  timestamp_start: "2026-11-07T10:20:30",
  allure_url: null,
} as unknown as TestRun;

describe("TAS/QG report urls", () => {
  it("uses <origin>/<suite>/<timestamp> for QG runs", () => {
    expect(buildAllureRunUrl(run, "Checkout", true, "QG")).toMatch(
      /\/QG\/checkout\/2026-11-07_10:20:30\/index\.html$/,
    );
    expect(buildAiAnalysisUrl(run, "checkout", true, "QG")).toMatch(
      /\/QG\/checkout\/2026-11-07_10:20:30\/analysis\/index\.html$/,
    );
  });

  it("defaults to TAS", () => {
    expect(buildAllureRunUrl(run, "wisp", true)).toMatch(/\/TAS\/wisp\//);
  });

  it("derives the analysis url from the stored report url", () => {
    const stored = { ...run, allure_url: "https://x.io/QG/wisp/2026-11-07_10:20:30/index.html" } as TestRun;
    expect(buildAiAnalysisUrl(stored, "wisp", true, "QG")).toBe(
      "https://x.io/QG/wisp/2026-11-07_10:20:30/analysis/index.html",
    );
  });
});
