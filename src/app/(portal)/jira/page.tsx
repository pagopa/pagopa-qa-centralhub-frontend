"use client";

import { useState } from "react";
import { useJiraOverview, useJiraTrend } from "@/hooks/useJira";
import type { JiraAlert, TrendWeek } from "@/types/index";

const JIRA_BASE = "https://pagopa.atlassian.net/browse";
const JIRA_SEARCH = "https://pagopa.atlassian.net/issues";
const BASE_JQL = 'project = PQ AND labels = "testing"';

function jiraUrl(extra: string) {
  return `${JIRA_SEARCH}/?jql=${encodeURIComponent(`${BASE_JQL} AND ${extra}`)}`;
}

const STATUS_COLOR: Record<string, string> = {
  "Backlog": "var(--text-muted)",
  "Selected for Development": "var(--info)",
  "In Progress": "var(--accent)",
  "READY FOR REVIEW": "var(--warning)",
  "IN REVIEW": "var(--warning)",
  "BLOCKED": "var(--danger)",
  "WAITING FOR": "var(--danger)",
  "Done": "var(--success)",
};

const PHASE_COLOR: Record<string, string> = {
  discovery: "var(--info)",
  delivery: "var(--accent)",
  support: "var(--warning)",
  other: "var(--text-muted)",
  done: "var(--success)",
};

function KpiCard({ label, value, color, href }: { label: string; value: number; color?: string; href?: string }) {
  const inner = (
    <div className={`flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 ${href ? "hover:bg-hover transition-colors cursor-pointer" : ""}`} style={{ minWidth: 110 }}>
      <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>{label}</span>
      <span className="text-2xl font-semibold" style={{ color: color ?? "var(--text)" }}>{value}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
}

function HBar({ label, count, max, color, href }: { label: string; count: number; max: number; color?: string; href?: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const inner = (
    <div className={`flex items-center gap-2 text-[13px] rounded-[var(--radius-sm)] px-1 -mx-1 ${href ? "hover:bg-hover cursor-pointer transition-colors" : ""}`}>
      <span className="text-text-dim w-52 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? "var(--accent)" }} />
      </div>
      <span className="text-text-muted font-mono w-6 text-right">{count}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
}

function AlertTable({ alerts, title, color }: { alerts: JiraAlert[]; title: string; color: string }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-medium" style={{ color }}>{title} ({alerts.length})</p>
      <div className="rounded-[var(--radius)] border border-border overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <tbody>
            {alerts.map((a) => (
              <tr key={a.key} className="border-b border-border last:border-0 hover:bg-hover">
                <td className="px-3 py-2 font-mono whitespace-nowrap">
                  <a href={`${JIRA_BASE}/${a.key}`} target="_blank" rel="noopener noreferrer"
                    className="text-accent hover:underline">{a.key}</a>
                </td>
                <td className="px-3 py-2 text-text-dim">{a.summary}</td>
                <td className="px-3 py-2 text-right text-text-muted whitespace-nowrap font-mono">{a.days}gg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ weeks }: { weeks: TrendWeek[] }) {
  const phases: Array<{ key: keyof TrendWeek; label: string }> = [
    { key: "discovery", label: "Discovery" },
    { key: "delivery", label: "Delivery" },
    { key: "support", label: "Support" },
    { key: "done", label: "Done" },
  ];
  const max = Math.max(...weeks.map((w) => w.discovery + w.delivery + w.support + w.done), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 flex-wrap">
        {phases.map((p) => (
          <div key={p.key} className="flex items-center gap-1 text-[12px] text-text-dim">
            <div className="w-3 h-3 rounded-sm" style={{ background: PHASE_COLOR[p.key] }} />
            {p.label}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-32">
        {weeks.map((w) => {
          const total = w.discovery + w.delivery + w.support + w.done;
          const heightPct = (total / max) * 100;
          return (
            <div key={w.week} className="flex-1 flex flex-col justify-end gap-px" title={`${w.week}: ${total} issue`}>
              <div className="flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${heightPct}%`, minHeight: total > 0 ? 4 : 0 }}>
                {phases.map((p) => {
                  const val = w[p.key] as number;
                  const pct = total > 0 ? (val / total) * 100 : 0;
                  return pct > 0 ? (
                    <div key={p.key} style={{ height: `${pct}%`, background: PHASE_COLOR[p.key], minHeight: 2 }} />
                  ) : null;
                })}
              </div>
              <span className="text-[9px] text-text-muted text-center font-mono">{w.week.split("-W")[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TABS = ["Monitoraggio", "Insights"] as const;
type Tab = (typeof TABS)[number];

export default function JiraPage() {
  const [tab, setTab] = useState<Tab>("Monitoraggio");
  const { data: overview, isLoading: ovLoading } = useJiraOverview();
  const { data: trend, isLoading: trendLoading } = useJiraTrend();

  const inProgress = overview?.by_status.find((s) => s.name === "In Progress")?.count ?? 0;
  const done = overview?.by_status.find((s) => s.name === "Done")?.count ?? 0;
  const blocked = overview?.by_status.find((s) => s.name === "BLOCKED")?.count ?? 0;
  const maxStatus = Math.max(...(overview?.by_status.map((s) => s.count) ?? [1]));
  const maxComp = Math.max(...(overview?.by_component.map((c) => c.count) ?? [1]));
  const maxAssignee = Math.max(...(overview?.by_assignee.map((a) => a.count) ?? [1]));
  const maxType = Math.max(...(overview?.by_type.map((t) => t.count) ?? [1]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">KPI Jira — Testing</h1>
        <a href="https://pagopa.atlassian.net/jira/software/c/projects/PQ/boards/597"
          target="_blank" rel="noopener noreferrer"
          className="text-[12px] text-accent hover:underline">
          ↗ Apri board
        </a>
      </div>

      {ovLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : overview && (
        <div className="flex gap-3 flex-wrap">
          <KpiCard label="Totale" value={overview.total} href={`${JIRA_SEARCH}/?jql=${encodeURIComponent(BASE_JQL)}`} />
          <KpiCard label="In Progress" value={inProgress} color="var(--accent)" href={jiraUrl('status = "In Progress"')} />
          <KpiCard label="Done" value={done} color="var(--success)" href={jiraUrl('status = "Done"')} />
          <KpiCard label="Blocked" value={blocked} color={blocked > 0 ? "var(--danger)" : undefined} href={jiraUrl('status = "BLOCKED"')} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-[13px] transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--text-dim)",
              fontWeight: tab === t ? 500 : 400,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Monitoraggio" && overview && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Section title="Status">
              <div className="flex flex-col gap-2">
                {overview.by_status.map((s) => (
                  <HBar key={s.name} label={s.name} count={s.count} max={maxStatus}
                    color={STATUS_COLOR[s.name] ?? "var(--accent)"}
                    href={jiraUrl(`status = "${s.name}"`)} />
                ))}
              </div>
            </Section>

            <Section title="Componente">
              <div className="flex flex-col gap-2">
                {overview.by_component.length > 0
                  ? overview.by_component.map((c) => (
                    <HBar key={c.name} label={c.name} count={c.count} max={maxComp}
                      href={jiraUrl(`component = "${c.name}"`)} />
                  ))
                  : <Empty />}
              </div>
            </Section>

            <Section title="Workload">
              <div className="flex flex-col gap-2">
                {overview.by_assignee.length > 0
                  ? overview.by_assignee.map((a) => (
                    <HBar key={a.name} label={a.name} count={a.count} max={maxAssignee} color="var(--info)"
                      href={jiraUrl(`assignee = "${a.name}"`)} />
                  ))
                  : <Empty />}
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-[14px] text-text">Alert</h2>
            <AlertTable alerts={overview.alerts_no_estimate} title="In Progress senza stima" color="var(--warning)" />
            <AlertTable alerts={overview.alerts_backlog_old} title="In Backlog da &gt; 30 giorni" color="var(--danger)" />
            <AlertTable alerts={overview.alerts_blocked_old} title="BLOCKED da &gt; 30 giorni" color="var(--danger)" />
            {overview.alerts_no_estimate.length === 0 &&
              overview.alerts_backlog_old.length === 0 &&
              overview.alerts_blocked_old.length === 0 && (
                <p className="text-[13px] text-success">Nessun alert attivo ✓</p>
              )}
          </div>
        </div>
      )}

      {tab === "Insights" && (
        <div className="flex flex-col gap-4">
          {overview && (
            <Section title="Distribuzione per tipo issue">
              <div className="flex flex-col gap-2">
                {overview.by_type.map((t) => (
                  <HBar key={t.name} label={t.name} count={t.count} max={maxType}
                    color={PHASE_COLOR[t.phase] ?? "var(--accent)"}
                    href={jiraUrl(`issuetype = "${t.name}"`)} />
                ))}
              </div>
            </Section>
          )}
          <Section title="Issue create per settimana (ultimi 3 mesi)">
            {trendLoading
              ? <p className="text-text-muted text-[13px]">Caricamento…</p>
              : trend
                ? <TrendChart weeks={trend.weeks} />
                : null}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="font-semibold text-[13px] text-text">{title}</p>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-[12px] text-text-muted">Nessun dato</p>;
}
