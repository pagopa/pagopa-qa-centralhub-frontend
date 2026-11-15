import { describe, expect, it } from "vitest";
import type { FlakyScenarioRow } from "@/types/flaky";
import { classifyRunScenario, summarizeRunFlakiness } from "./runFlakiness";

function score(overrides: Partial<FlakyScenarioRow>): FlakyScenarioRow {
  return {
    test_object: "checkout", test_type: "e2e", scenario_name: "S", env: "UAT", score: 0, level: 1,
    state: "OK", flip_rate: 0, retry_pass_rate: 0, runs_analyzed: 20, last_failure_at: null,
    recent_outcomes: [], last_suite_id: null, is_flaky: false, flagged_by: null, flagged_at: null,
    hint: null, ...overrides,
  };
}

describe("classifyRunScenario", () => {
  it.each([
    ["flagged in the panel wins", score({ level: 5 }), true, "flagged"],
    ["high level and not flagged", score({ level: 4 }), false, "to_mark"],
    ["low level", score({ level: 2 }), false, "regression"],
    ["broken scenario", score({ level: 3, state: "BROKEN" }), false, "regression"],
    ["middle level", score({ level: 3 }), false, null],
    ["not enough runs", score({ level: null, score: null, state: "INSUFFICIENT_DATA" }), false, null],
    ["no score at all", undefined, false, null],
  ])("%s", (_name, row, flagged, expected) => {
    expect(classifyRunScenario(row, flagged)).toBe(expected);
  });
});

describe("summarizeRunFlakiness", () => {
  it("counts each category", () => {
    expect(summarizeRunFlakiness(["to_mark", "flagged", "regression", "regression", null])).toEqual({
      to_mark: 1, flagged: 1, regression: 2,
    });
  });
});
