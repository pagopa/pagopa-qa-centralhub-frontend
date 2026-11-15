export function formatFlakyDate(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export function formatFlakyRate(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

export const OUTCOME_LABELS = { P: "passato", R: "passato dopo retry", F: "fallito / broken" } as const;
