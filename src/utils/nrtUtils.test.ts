import { describe, expect, it } from "vitest";
import type { TestExecution, TestRun } from "@/types";
import { buildAiAnalysisUrl, buildAllureRunUrl, createFlakyScenario, isFlakyScenarioEqual, isScenarioInFlakyScenarios } from "./nrtUtils";

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

describe("flaky scenario matching", () => {
  const base = {
    suite_id: "suite-v1",
    test_object: "checkout",
    test_type: "e2e",
    scenario_name: "Pay with card",
    test_object_version: "1.0.0",
    test_version: "1",
    inserted_at: null,
    is_flaky: true,
  };

  it("matches the same scenario across product and test versions", () => {
    expect(isFlakyScenarioEqual(base, { ...base, suite_id: "suite-v2", test_object_version: "2.0.0", test_version: "7" })).toBe(true);
  });

  it("keeps scenarios of different test types apart", () => {
    expect(isFlakyScenarioEqual(base, { ...base, test_type: "api" })).toBe(false);
  });

  it("creates flaky scenarios carrying the suite test type", () => {
    const suite = { id: "suite-v2", test_object: "checkout", test_type: "e2e", test_object_version: "2.0.0", owner_team: null };
    const scenario = { scenario_name: "Pay with card" } as TestExecution;
    expect(createFlakyScenario(scenario, suite, "7")).toMatchObject({ test_type: "e2e", suite_id: "suite-v2", test_version: "7" });
    expect(isScenarioInFlakyScenarios(scenario, suite, "7", [base])).toBe(true);
  });
});
