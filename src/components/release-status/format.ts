const DATE_TIME = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Short "16/11 10:15" form used in deploy timelines. */
export function formatShortDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "HH:MM" of a timestamp, or "—" when missing or invalid. */
export function formatTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Detection window "HH:MM e HH:MM", with "dd/mm" on both ends when it spans two days. */
export function formatDetectionWindow(from: string, to: string): string {
  const start = new Date(from);
  const end = new Date(to);
  const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
  if (valid && !sameDay(start, end)) return `${formatShortDateTime(from)} e ${formatShortDateTime(to)}`;
  return `${formatTime(from)} e ${formatTime(to)}`;
}
