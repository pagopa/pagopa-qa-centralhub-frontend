export const NRT_PAGE_SIZE = 20;

export const NRT_TABLE_HEADERS = [
  "Suite",
  "Data",
  "Totale",
  "Passed",
  "Failed",
  "Broken",
  "Skipped",
  "Pass rate",
  "Trigger",
  "Origine",
  "Prod. ticket status",
  "Test ticket status",
  "Esito",
  "Revisione",
] as const;

export const NRT_SCENARIO_TABLE_HEADERS = [
  "Scenario",
  "Stato",
  "Durata",
  "Retry",
  "Errore",
  "Flaky",
  "Nota",
] as const;

export const NRT_REVISION_RESULT_OPTIONS = [
  { value: "NO_GO", label: "NO GO" },
  { value: "GO", label: "GO" },
  { value: "PENDING", label: "PENDING" },
] as const;

export const NRT_REVISION_RESULT_BACKGROUND_COLORS: Record<string, string> = {
  GO: "color-mix(in oklch, var(--success) 70%, transparent)",
  NO_GO: "color-mix(in oklch, var(--danger) 70%, transparent)",
  PENDING: "color-mix(in oklch, var(--warning) 70%, transparent)",
};

export const NRT_RUN_STATUSES = {
  passed: "passed",
  failed: "failed",
} as const;

export const NRT_SCENARIO_STAT_BACKGROUND_COLORS = {
  total: "color-mix(in oklch, var(--info) 70%, transparent)",
  passed: "color-mix(in oklch, var(--success) 70%, transparent)",
  failed: "color-mix(in oklch, var(--danger) 70%, transparent)",
  broken: "color-mix(in oklch, var(--warning) 70%, transparent)",
  skipped: "color-mix(in oklch, var(--warning) 70%, transparent)",
} as const;

export const NRT_ALLURE_REPORT_BASE_URL =
  "https://pagopa.github.io/pagopa-platform-integration-test";

export type TicketStatusStyle = {
  color: string;
  bg: string;
  dot: string;
};

