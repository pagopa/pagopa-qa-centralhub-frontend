/** Calendar helpers for the T&M absences page (same rules as the backend cost report). */

/** Easter Sunday (anonymous Gregorian algorithm), month 1-12. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1], [1, 6], [4, 25], [5, 1], [6, 2], [8, 15], [11, 1], [12, 8], [12, 25], [12, 26],
];

/** Days of the month (1-31) that are Italian public holidays, Easter and Easter Monday included. */
export function italianHolidays(year: number, month: number): Set<number> {
  const days = new Set<number>();
  for (const [m, d] of FIXED_HOLIDAYS) if (m === month) days.add(d);
  const easter = easterSunday(year);
  const sunday = new Date(Date.UTC(year, easter.month - 1, easter.day));
  const monday = new Date(Date.UTC(year, easter.month - 1, easter.day + 1));
  for (const dt of [sunday, monday]) {
    if (dt.getUTCMonth() + 1 === month) days.add(dt.getUTCDate());
  }
  return days;
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

export const ABSENCE_SOURCE_LABEL: Record<string, string> = {
  confluence: "Confluence",
  manual: "Manuale",
  csv: "Import CSV/ICS",
};
