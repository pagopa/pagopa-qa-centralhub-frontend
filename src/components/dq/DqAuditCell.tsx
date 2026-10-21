const AUDIT_DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function DqAuditCell({ date, user }: { date: string; user: string | null }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-[12px]">
      <time className="text-text-dim" dateTime={date}>
        {AUDIT_DATE_FORMATTER.format(new Date(date))}
      </time>
      <span className="block text-text-muted">{user ?? "—"}</span>
    </td>
  );
}