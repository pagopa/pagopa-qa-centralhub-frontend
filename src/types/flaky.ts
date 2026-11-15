// Flaky scenarios section (mirrors app/schemas/flaky.py in the backend).

export type FlakyEnv = "DEV" | "UAT" | "PROD";
export type FlakyHint = "to_mark" | "to_unmark" | "broken";
export type FlakyFlagFilter = "all" | "flagged" | "unflagged";
export type FlakyState = "OK" | "INSUFFICIENT_DATA" | "BROKEN";
export type FlakyOutcome = "P" | "R" | "F";

export interface FlakyScenarioKey {
  test_object: string;
  test_type: string;
  scenario_name: string;
}

export interface OutcomePoint {
  run_id: string;
  ts: string;
  outcome: FlakyOutcome;
}

export interface FlakyScenarioRow extends FlakyScenarioKey {
  env: FlakyEnv;
  score: number | null;
  level: number | null;
  state: FlakyState;
  flip_rate: number | null;
  retry_pass_rate: number | null;
  runs_analyzed: number;
  last_failure_at: string | null;
  recent_outcomes: OutcomePoint[];
  last_suite_id: string | null;
  is_flaky: boolean;
  flagged_by: string | null;
  flagged_at: string | null;
  hint: FlakyHint | null;
}

export interface FlakySummary {
  to_mark: number;
  to_unmark: number;
  broken: number;
  flagged: number;
  analyzed: number;
}

export interface FlakyHistoryItem {
  run_id: string;
  ts: string;
  outcome: FlakyOutcome;
  status: string;
  retries: number | null;
  error_message: string | null;
  allure_url: string | null;
  test_version: string | null;
  test_object_version: string;
  /** Run origin: TAS runs open the TAS report, the others the NRT report. */
  test_origin: string | null;
}

export interface FlakyRecomputeStatus {
  last_attempt_at: string;
  last_success_at: string | null;
  last_error: string | null;
  last_trigger: "SCHEDULE" | "MANUAL" | null;
  last_requested_by: string | null;
  scored_count: number;
}

export interface FlakyFilters {
  env: FlakyEnv;
  testObjects: string[];
  flag: FlakyFlagFilter;
  minLevel: number | null;
  hint: FlakyHint | null;
  q: string;
}

export interface FlakyHistoryKey extends FlakyScenarioKey {
  env: FlakyEnv;
}
