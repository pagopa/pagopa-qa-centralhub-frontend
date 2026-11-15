import type { FlakyScenarioRow } from "@/types/flaky";

export type RunScenarioCategory = "to_mark" | "flagged" | "regression";

/**
 * How a non-passed scenario of a run reads against its flakiness index:
 * flagged in the panel, very flaky but not flagged, or stable (a likely regression).
 */
export function classifyRunScenario(
  score: FlakyScenarioRow | undefined,
  flagged: boolean,
): RunScenarioCategory | null {
  if (flagged) return "flagged";
  if (!score) return null;
  if (score.state === "BROKEN") return "regression";
  if (score.state !== "OK" || score.level == null) return null;
  if (score.level >= 4) return "to_mark";
  if (score.level <= 2) return "regression";
  return null;
}

export function summarizeRunFlakiness(
  categories: Array<RunScenarioCategory | null>,
): Record<RunScenarioCategory, number> {
  const summary: Record<RunScenarioCategory, number> = { to_mark: 0, flagged: 0, regression: 0 };
  for (const category of categories) {
    if (category) summary[category] += 1;
  }
  return summary;
}
