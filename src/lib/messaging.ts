import { Activity, Bell, ClipboardCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import type { BellState, InboxItem, InboxSummary, Severity } from "@/types/messaging";

/** The bell is "unknown" while the summary is loading or failed: it must never claim "all read". */
export function bellState(summary: InboxSummary | undefined): BellState | "unknown" {
  if (!summary) return "unknown";
  if (summary.unread > 0) return "unread";
  return summary.total > 0 ? "read" : "empty";
}

export function formatBadge(unread: number): string {
  return unread > 9 ? "9+" : String(unread);
}

export function bellTone(severity: Severity | null): Severity {
  return severity ?? "info";
}

export function bellLabel(summary: InboxSummary | undefined): string {
  const state = bellState(summary);
  if (state === "empty") return "Nessun messaggio";
  if (state === "read") return "Tutti i messaggi sono stati letti";
  if (state === "unread" && summary) {
    return summary.unread === 1 ? "1 messaggio non letto" : `${summary.unread} messaggi non letti`;
  }
  return "Messaggi";
}

const LONG_DATE = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Groups messages (already newest first) under "Oggi", "Ieri" or the long Italian date. */
export function groupByDay(items: InboxItem[], now: Date): { label: string; items: InboxItem[] }[] {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups: { key: string; label: string; items: InboxItem[] }[] = [];
  for (const item of items) {
    const created = new Date(item.created_at);
    const key = dayKey(created);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = key === today ? "Oggi" : key === yesterday ? "Ieri" : LONG_DATE.format(created);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.map(({ label, items: groupItems }) => ({ label, items: groupItems }));
}

export function severityCounts(items: InboxItem[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { info: 0, warning: 0, critical: 0 };
  for (const item of items) {
    if (item.read_at === null) counts[item.severity] += 1;
  }
  return counts;
}

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
  /** Text of the button that opens the section the message points to. */
  cta: string;
}

const TYPE_META: Record<string, TypeMeta> = {
  "it.pagopa.qa.quality_gate.run.completed": { label: "Quality Gate", icon: ShieldCheck, cta: "Apri report" },
  "it.pagopa.qa.nrt.reviews.pending": { label: "NRT", icon: ClipboardCheck, cta: "Vai agli NRT" },
  "it.pagopa.qa.sanp_health.checks.failing": { label: "SANP Health", icon: Activity, cta: "Apri SANP Health" },
};

export function typeMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? { label: "Sistema", icon: Bell, cta: "Apri" };
}

/** Italian relative time ("12 minuti fa"); `fmtRelativeTime` in lib/format.ts is English-only. */
export function relativeTimeIt(value: string | Date, now: Date = new Date()): string {
  const then = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 45) return "adesso";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minuto fa" : `${minutes} minuti fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 ora fa" : `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 giorno fa" : `${days} giorni fa`;
}
