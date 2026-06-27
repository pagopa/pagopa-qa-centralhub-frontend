"use client";

import { useState } from "react";
import {
  useJiraOverview, useJiraTrend,
  useJiraSanpOverview, useJiraSanpTrend,
  useJiraDataOverview, useJiraDataTrend,
  useJiraEstimateDrift, useJiraSanpEstimateDrift, useJiraDataEstimateDrift,
} from "@/hooks/useJira";
import type { JiraAlert, JiraOverview, JiraTrend, TrendWeek, JiraEstimateDrift, EstimateDriftGroup, EstimateDriftItem } from "@/types/index";
import { RouteGuard } from "@/components/auth/RouteGuard";

const JIRA_BASE = "https://pagopa.atlassian.net/browse";
const JIRA_SEARCH = "https://pagopa.atlassian.net/issues";

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

function isoWeekRange(isoKey: string): { from: string; to: string } {
  const [year, wnum] = isoKey.split("-W").map(Number);
  const jan4 = new Date(year, 0, 4);
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(week1Mon);
  monday.setDate(week1Mon.getDate() + (wnum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(monday), to: fmt(sunday) };
}

function TrendChart({ weeks, baseJql }: { weeks: TrendWeek[]; baseJql: string }) {
  const max = Math.max(...weeks.map((w) => Math.max(w.created, w.closed)), 1);

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--text-muted)", opacity: 0.4 }} />
          Create
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-text-dim">
          <div className="w-3 h-3 rounded-sm" style={{ background: "var(--success)" }} />
          Chiuse
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1.5 h-36">
        {weeks.map((w) => {
          const { from, to } = isoWeekRange(w.week);
          const createdUrl = `${JIRA_SEARCH}/?jql=${encodeURIComponent(`${baseJql} AND created >= "${from}" AND created <= "${to}"`)}`;
          const closedUrl = `${JIRA_SEARCH}/?jql=${encodeURIComponent(`${baseJql} AND resolutiondate >= "${from}" AND resolutiondate <= "${to}"`)}`;
          return (
            <div
              key={w.week}
              className="flex-1 flex flex-col justify-end gap-px group"
              title={`${w.label}: ${w.created} create, ${w.closed} chiuse`}
            >
              <div className="flex items-end gap-px justify-center">
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-t-sm hover:opacity-60 transition-opacity"
                  style={{
                    height: `${Math.max((w.created / max) * 136, w.created > 0 ? 3 : 0)}px`,
                    background: "var(--text-dim)",
                    opacity: 0.35,
                    display: "block",
                  }}
                />
                <a
                  href={closedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-t-sm hover:opacity-60 transition-opacity"
                  style={{
                    height: `${Math.max((w.closed / max) * 136, w.closed > 0 ? 3 : 0)}px`,
                    background: "var(--success)",
                    opacity: 0.8,
                    display: "block",
                  }}
                />
              </div>
              <span className="text-[9px] text-text-muted text-center font-mono leading-tight mt-1 truncate">
                {w.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {weeks.length > 0 && (() => {
        const totalCreated = weeks.reduce((s, w) => s + w.created, 0);
        const totalClosed = weeks.reduce((s, w) => s + w.closed, 0);
        const delta = totalClosed - totalCreated;
        return (
          <p className="text-[12px] text-text-muted">
            Ultimi 3 mesi: <span className="text-text font-medium">{totalCreated}</span> create,{" "}
            <span className="text-text font-medium">{totalClosed}</span> chiuse{" "}
            <span style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }}>
              ({delta >= 0 ? "−" : "+"}{Math.abs(delta)} backlog)
            </span>
          </p>
        );
      })()}
    </div>
  );
}

const SECTIONS = [
  {
    key: "testing",
    label: "Testing",
    boardUrl: "https://pagopa.atlassian.net/jira/software/c/projects/PQ/boards/597",
    baseJql: 'project = PQ AND labels = "testing"',
  },
  {
    key: "sanp",
    label: "Supporto SANP / SACI",
    boardUrl: "https://pagopa.atlassian.net/jira/servicedesk/projects/PIDM/queues/custom/1919",
    baseJql: 'project = PIDM AND "request type" = "SANP/SACI Support (PIDM)"',
  },
  {
    key: "data",
    label: "Supporto Data",
    boardUrl: "https://pagopa.atlassian.net/jira/servicedesk/projects/PIDM/queues/custom/1416/board/6360",
    baseJql: 'project = PIDM AND "request type" = "Data Quality Support (PIDM)"',
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function JiraPage() {
  const [section, setSection] = useState<SectionKey>("testing");

  const current = SECTIONS.find((s) => s.key === section)!;

  const testing = { overview: useJiraOverview(), trend: useJiraTrend(), drift: useJiraEstimateDrift() };
  const sanp    = { overview: useJiraSanpOverview(), trend: useJiraSanpTrend(), drift: useJiraSanpEstimateDrift() };
  const data    = { overview: useJiraDataOverview(), trend: useJiraDataTrend(), drift: useJiraDataEstimateDrift() };

  const { overview: ovQuery, trend: trendQuery, drift: driftQuery } =
    section === "testing" ? testing : section === "sanp" ? sanp : data;

  return (
    <RouteGuard action="view:jira">
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">KPI Jira</h1>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className="px-4 py-2 text-[13px] transition-colors border-b-2 -mb-px"
            style={{
              borderColor: section === s.key ? "var(--accent)" : "transparent",
              color: section === s.key ? "var(--accent)" : "var(--text-dim)",
              fontWeight: section === s.key ? 500 : 400,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {ovQuery.isLoading
        ? <p className="text-text-muted text-[13px]">Caricamento…</p>
        : ovQuery.data
          ? <SectionDashboard
              overview={ovQuery.data}
              trend={trendQuery.data ?? null}
              trendLoading={trendQuery.isLoading}
              drift={driftQuery.data ?? null}
              driftLoading={driftQuery.isLoading}
              baseJql={current.baseJql}
              boardUrl={current.boardUrl}
              sectionKey={section}
            />
          : null}
    </div>
    </RouteGuard>
  );
}

// ── Reusable dashboard ────────────────────────────────────────────────────────

function SectionDashboard({
  overview,
  trend,
  trendLoading,
  drift,
  driftLoading,
  baseJql,
  boardUrl,
  sectionKey,
}: {
  overview: JiraOverview;
  trend: JiraTrend | null;
  trendLoading: boolean;
  drift: JiraEstimateDrift | null;
  driftLoading: boolean;
  baseJql: string;
  boardUrl: string;
  sectionKey: SectionKey;
}) {
  const [tab, setTab] = useState<"Monitoraggio" | "Insights">("Monitoraggio");

  const jqlUrl = (extra: string) =>
    `${JIRA_SEARCH}/?jql=${encodeURIComponent(`${baseJql} AND ${extra}`)}`;

  const inProgress = overview.by_status.find((s) => s.name === "In Progress")?.count ?? 0;
  const done       = overview.by_status.find((s) => s.name === "Done")?.count ?? 0;
  const blocked    = overview.by_status.find((s) => s.name === "BLOCKED")?.count ?? 0;
  const waitingForSupport = overview.by_status
    .filter((s) => s.name.toLowerCase() === "waiting for support")
    .reduce((sum, s) => sum + s.count, 0);
  const maxStatus  = Math.max(...overview.by_status.map((s) => s.count), 1);
  const maxComp    = Math.max(...overview.by_component.map((c) => c.count), 1);
  const maxAssignee = Math.max(...overview.by_assignee.map((a) => a.count), 1);
  const maxType    = Math.max(...overview.by_type.map((t) => t.count), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-3 flex-wrap flex-1">
          <KpiCard label="Totale" value={overview.total}
            href={`${JIRA_SEARCH}/?jql=${encodeURIComponent(baseJql)}`} />
          <KpiCard label="In Progress" value={inProgress} color="var(--accent)"
            href={jqlUrl('status = "In Progress"')} />
          <KpiCard label="Done" value={done} color="var(--success)"
            href={jqlUrl('status = "Done"')} />
          <KpiCard label="Blocked" value={blocked}
            color={blocked > 0 ? "var(--danger)" : undefined}
            href={jqlUrl('status = "BLOCKED"')} />
          {sectionKey !== "testing" && (
            <KpiCard label="Waiting for support" value={waitingForSupport}
              color={waitingForSupport > 0 ? "var(--danger)" : undefined}
              href={jqlUrl('status = "Waiting for support"')} />
          )}
        </div>
        <a href={boardUrl} target="_blank" rel="noopener noreferrer"
          className="text-[12px] text-accent hover:underline shrink-0">
          ↗ Apri board
        </a>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["Monitoraggio", "Insights"] as const).map((t) => (
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

      {tab === "Monitoraggio" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <Section title="Status">
              <div className="flex flex-col gap-2">
                {overview.by_status.map((s) => (
                  <HBar key={s.name} label={s.name} count={s.count} max={maxStatus}
                    color={STATUS_COLOR[s.name] ?? "var(--accent)"}
                    href={jqlUrl(`status = "${s.name}"`)} />
                ))}
              </div>
            </Section>

            <Section title="Componente">
              <div className="flex flex-col gap-2">
                {overview.by_component.length > 0
                  ? overview.by_component.map((c) => (
                    <HBar key={c.name} label={c.name} count={c.count} max={maxComp}
                      href={jqlUrl(`component = "${c.name}"`)} />
                  ))
                  : <Empty />}
              </div>
            </Section>

            <Section title="Workload">
              <div className="flex flex-col gap-2">
                {overview.by_assignee.length > 0
                  ? overview.by_assignee.map((a) => (
                    <HBar key={a.name} label={a.name} count={a.count} max={maxAssignee}
                      color="var(--info)"
                      href={jqlUrl(`assignee = "${a.name}" AND status != Done`)} />
                  ))
                  : <Empty />}
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-[14px] text-text">Alert</h2>
            {sectionKey === "testing" ? (
              <>
                <AlertTable alerts={overview.alerts_no_estimate} title="In Progress senza stima" color="var(--warning)" />
                <AlertTable alerts={overview.alerts_backlog_old} title="In Backlog da &gt; 30 giorni" color="var(--danger)" />
                <AlertTable alerts={overview.alerts_blocked_old} title="BLOCKED da &gt; 30 giorni" color="var(--danger)" />
                {overview.alerts_no_estimate.length === 0 &&
                  overview.alerts_backlog_old.length === 0 &&
                  overview.alerts_blocked_old.length === 0 && (
                    <p className="text-[13px] text-success">Nessun alert attivo ✓</p>
                  )}
              </>
            ) : (
              <>
                <AlertTable alerts={overview.alerts_open_old} title="Non presi in carico da &gt; 5 giorni" color="var(--warning)" />
                <AlertTable alerts={overview.alerts_in_progress_old} title="In lavorazione senza aggiornamenti da &gt; 10 giorni" color="var(--danger)" />
                <AlertTable alerts={overview.alerts_blocked_old} title="BLOCKED da &gt; 30 giorni" color="var(--danger)" />
                {overview.alerts_open_old.length === 0 &&
                  overview.alerts_in_progress_old.length === 0 &&
                  overview.alerts_blocked_old.length === 0 && (
                    <p className="text-[13px] text-success">Nessun alert attivo ✓</p>
                  )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "Insights" && (
        <div className="flex flex-col gap-4">
          <Section title="Distribuzione per tipo issue">
            <div className="flex flex-col gap-2">
              {overview.by_type.map((t) => (
                <HBar key={t.name} label={t.name} count={t.count} max={maxType}
                  color={PHASE_COLOR[t.phase] ?? "var(--accent)"}
                  href={jqlUrl(`issuetype = "${t.name}"`)} />
              ))}
            </div>
          </Section>
          <Section title="Intake vs Chiuse per settimana (ultimi 3 mesi)">
            {trendLoading
              ? <p className="text-text-muted text-[13px]">Caricamento…</p>
              : trend
                ? <TrendChart weeks={trend.weeks} baseJql={baseJql} />
                : null}
          </Section>
          <Section title="Drift Stime">
            {driftLoading
              ? <p className="text-text-muted text-[13px]">Caricamento…</p>
              : drift
                ? <EstimateDriftPanel drift={drift} />
                : <Empty />}
          </Section>
        </div>
      )}
    </div>
  );
}

// ── Estimate Drift Panel ──────────────────────────────────────────────────────

function fmtHours(sec: number): string {
  const h = Math.round(sec / 3600);
  return `${h}h`;
}

function DriftBar({ original, spent }: { original: number; spent: number }) {
  if (original === 0) return null;
  const pct = Math.min((spent / original) * 100, 200); // cap at 200% visually
  const over = spent > original;
  const overPct = over ? Math.min(((spent - original) / original) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-3 rounded-full bg-subtle overflow-hidden">
        {/* stima originale = 100% */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${Math.min((spent / original) * 100, 100)}%`,
            background: over ? "var(--danger)" : "var(--success)",
          }}
        />
        {/* overflow oltre il 100% */}
        {over && (
          <div
            className="absolute top-0 h-full rounded-r-full"
            style={{
              left: "100%",
              width: `${overPct}%`,
              background: "var(--danger)",
              opacity: 0.5,
              maxWidth: "100%",
            }}
          />
        )}
        {/* marker al 100% */}
        <div className="absolute top-0 bottom-0 w-px bg-border" style={{ left: "calc(100% - 1px)" }} />
      </div>
      <div className="flex justify-between text-[11px] text-text-muted font-mono">
        <span>0</span>
        <span>stima {fmtHours(original)}</span>
      </div>
    </div>
  );
}

function DriftGroupBar({ group, maxOriginal }: { group: EstimateDriftGroup; maxOriginal: number }) {
  const drift = group.time_spent_sec - group.original_estimate_sec;
  const over = drift > 0;
  const driftColor = over ? "var(--danger)" : "var(--success)";
  const pctEst = maxOriginal > 0 ? (group.original_estimate_sec / maxOriginal) * 100 : 0;
  const pctSpent = maxOriginal > 0 ? (group.time_spent_sec / maxOriginal) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-text-dim truncate max-w-[180px]">{group.name}</span>
        <span className="font-mono" style={{ color: driftColor }}>
          {over ? "+" : ""}{fmtHours(drift)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-subtle overflow-hidden">
        {/* stima */}
        <div className="absolute left-0 top-0 h-full rounded-full opacity-30"
          style={{ width: `${pctEst}%`, background: "var(--text-dim)" }} />
        {/* spent */}
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: `${Math.min(pctSpent, 100)}%`, background: over ? "var(--danger)" : "var(--success)", opacity: 0.8 }} />
      </div>
    </div>
  );
}

function EstimateDriftPanel({ drift }: { drift: JiraEstimateDrift }) {
  const [sortBy, setSortBy] = useState<"drift_sec" | "original_estimate_sec" | "time_spent_sec">("drift_sec");
  const [showAll, setShowAll] = useState(false);

  if (drift.issues_with_estimate === 0) {
    return <p className="text-[13px] text-text-muted">Nessuna issue con stima originaria valorizzata.</p>;
  }

  const totalDrift = drift.drift_sec;
  const over = totalDrift > 0;
  const driftColor = over ? "var(--danger)" : "var(--success)";

  const maxGroup = Math.max(
    ...drift.by_assignee.map((g) => Math.max(g.original_estimate_sec, g.time_spent_sec)),
    1,
  );

  const sorted = [...drift.items].sort((a, b) => {
    if (sortBy === "drift_sec") return b.drift_sec - a.drift_sec;
    if (sortBy === "original_estimate_sec") return b.original_estimate_sec - a.original_estimate_sec;
    return b.time_spent_sec - a.time_spent_sec;
  });
  const displayed = showAll ? sorted : sorted.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI strip */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4" style={{ minWidth: 120 }}>
          <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Issue con stima</span>
          <span className="text-2xl font-semibold text-text">{drift.issues_with_estimate}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4" style={{ minWidth: 120 }}>
          <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Stima totale</span>
          <span className="text-2xl font-semibold text-text">{fmtHours(drift.total_original_sec)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4" style={{ minWidth: 120 }}>
          <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Consuntivato</span>
          <span className="text-2xl font-semibold text-text">{fmtHours(drift.total_spent_sec)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4" style={{ minWidth: 120 }}>
          <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>Drift totale</span>
          <span className="text-2xl font-semibold" style={{ color: driftColor }}>
            {over ? "+" : ""}{fmtHours(totalDrift)}
          </span>
        </div>
      </div>

      {/* Barra visiva stima vs consuntivato */}
      <DriftBar original={drift.total_original_sec} spent={drift.total_spent_sec} />

      {/* Breakdown per assignee e per tipo */}
      {(drift.by_assignee.length > 0 || drift.by_type.length > 0) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {drift.by_assignee.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium text-text-dim">Per assignee</p>
              <div className="flex flex-col gap-3">
                {drift.by_assignee.map((g) => (
                  <DriftGroupBar key={g.name} group={g} maxOriginal={maxGroup} />
                ))}
              </div>
              <div className="flex gap-3 text-[11px] text-text-muted">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-30" style={{ background: "var(--text-dim)" }} /> Stima</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "var(--success)", opacity: 0.8 }} /> Spent</span>
              </div>
            </div>
          )}
          {drift.by_type.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium text-text-dim">Per tipo issue</p>
              <div className="flex flex-col gap-3">
                {drift.by_type.map((g) => (
                  <DriftGroupBar key={g.name} group={g} maxOriginal={maxGroup} />
                ))}
              </div>
              <div className="flex gap-3 text-[11px] text-text-muted">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-30" style={{ background: "var(--text-dim)" }} /> Stima</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "var(--success)", opacity: 0.8 }} /> Spent</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabella drill-down */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-medium text-text-dim">Dettaglio issue</p>
          <div className="flex gap-1">
            {(["drift_sec", "original_estimate_sec", "time_spent_sec"] as const).map((col) => (
              <button key={col} onClick={() => setSortBy(col)}
                className="px-2 py-1 text-[11px] rounded border transition-colors"
                style={{
                  borderColor: sortBy === col ? "var(--accent)" : "var(--border)",
                  color: sortBy === col ? "var(--accent)" : "var(--text-muted)",
                  background: sortBy === col ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                }}>
                {col === "drift_sec" ? "Drift" : col === "original_estimate_sec" ? "Stima" : "Spent"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-border overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-3 py-2 text-left font-mono text-text-muted font-normal">Issue</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal">Summary</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden sm:table-cell">Tipo</th>
                <th className="px-3 py-2 text-left text-text-muted font-normal hidden md:table-cell">Assignee</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Stima</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Spent</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">Drift</th>
                <th className="px-3 py-2 text-right text-text-muted font-normal font-mono">%</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item) => {
                const itemOver = item.drift_sec > 0;
                const driftCol = itemOver ? "var(--danger)" : item.drift_sec < 0 ? "var(--success)" : "var(--text-muted)";
                return (
                  <tr key={item.key} className="border-b border-border last:border-0 hover:bg-hover">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      <a href={`${JIRA_BASE}/${item.key}`} target="_blank" rel="noopener noreferrer"
                        className="text-accent hover:underline">{item.key}</a>
                    </td>
                    <td className="px-3 py-2 text-text-dim max-w-[220px] truncate">{item.summary}</td>
                    <td className="px-3 py-2 text-text-muted hidden sm:table-cell">{item.issue_type}</td>
                    <td className="px-3 py-2 text-text-muted hidden md:table-cell">{item.assignee}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-dim">{fmtHours(item.original_estimate_sec)}</td>
                    <td className="px-3 py-2 text-right font-mono text-text-dim">{fmtHours(item.time_spent_sec)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: driftCol }}>
                      {itemOver ? "+" : ""}{fmtHours(item.drift_sec)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: driftCol }}>
                      {itemOver ? "+" : ""}{item.drift_pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length > 10 && (
          <button onClick={() => setShowAll((v) => !v)}
            className="text-[12px] text-accent hover:underline self-start">
            {showAll ? "Mostra meno" : `Mostra tutte le ${sorted.length} issue`}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="font-semibold text-[13px] text-text">{title}</p>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-[12px] text-text-muted">Nessun dato</p>;
}
