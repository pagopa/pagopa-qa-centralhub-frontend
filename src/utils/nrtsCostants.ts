export const NRT_PAGE_SIZE = 20;

export const NRT_TABLE_HEADERS = [
  { id: "suite", label: "Suite", description: "Suite di test",visibleInTas: true },
  { id: "date", label: "Data", description: "Data del test", visibleInTas: true },
  { id: "total", label: "Totale", description: "Totale scenari", visibleInTas: true },
  { id: "passed", label: "Passed", description: "Scenari passati", visibleInTas: true },
  { id: "failed", label: "Failed", description: "Scenari falliti", visibleInTas: true },
  { id: "broken", label: "Broken", description: "Scenari interrotti", visibleInTas: true },
  { id: "skipped", label: "Skipped", description: "Scenari saltati", visibleInTas: true },
  { id: "passRate", label: "Pass rate", description: "Percentuale di passaggio", visibleInTas: true },
  { id: "trigger", label: "Trigger", description: "Tipo di trigger (es. Manuale, Automatico)", visibleInTas: true },
  { id: "origin", label: "Origine", description: "Origine del test (es. NRT, TAS)", visibleInTas: true },
  { id: "productIssueStatus", label: "Prod. ticket status", description: "Stato del ticket prodotto", visibleInTas: true },
  { id: "qaIssueStatus", label: "QA ticket status", description: "Stato del ticket QA", visibleInTas: false },
  { id: "result", label: "Esito", description: "Esito del test", visibleInTas: false },
  { id: "revision", label: "Revisione", description: "Stato della revisione", visibleInTas: false },
] as const satisfies ReadonlyArray<{ id: string; label: string; description: string; visibleInTas: boolean }>;

export const NRT_SCENARIO_TABLE_HEADERS = [
  { id: "scenario", label: "Scenario", description: "Nome dello scenario", visibleInTas: true },
  { id: "status", label: "Stato", description: "Stato dello scenario", visibleInTas: true },
  { id: "duration", label: "Durata", description: "Durata dello scenario", visibleInTas: true },
  { id: "retries", label: "Retry", description: "Numero di retry", visibleInTas: true },
  { id: "error", label: "Errore", description: "Errore dello scenario", visibleInTas: true },
  { id: "flaky", label: "Flaky", description: "Indica se lo scenario è flaky", visibleInTas: false },
  { id: "note", label: "Nota", description: "Nota di revisione", visibleInTas: false },
] as const satisfies ReadonlyArray<{ id: string; label: string; description: string; visibleInTas: boolean }>;

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

export const NRT_ALLURE_SUBFOLDER_BY_TEST_OBJECT: Record<string, string> = {
  wisp: "wisp-tests",
  checkout: "checkout-e2e-tests",
  fdr3: "fdr3-tests",
};

export type TicketStatusStyle = {
  color: string;
  bg: string;
  dot: string;
};

