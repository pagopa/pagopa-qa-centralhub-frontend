"use client";

import { useMemo, useState } from "react";
import { useGpdPositionSnapshots, useSyncGpdPositions } from "@/hooks/useGpdPositions";
import { fmtNumberIt } from "@/lib/format";
import type { GpdPositionSnapshot } from "@/types/index";
import { LineChart } from "./LineChart";
import { Gate } from "@/lib/permissions";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const PERIODS = [
  { key: "7", label: "7gg", days: 7 },
  { key: "30", label: "30gg", days: 30 },
  { key: "90", label: "90gg", days: 90 },
  { key: "all", label: "Tutto", days: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

const METRICS: { key: keyof GpdPositionSnapshot; label: string }[] = [
  { key: "total", label: "Totale" },
  { key: "gpd", label: "GPD" },
  { key: "gpd_payable", label: "GPD Pagabili" },
  { key: "gpd4aca", label: "GPD4ACA" },
  { key: "gpd4aca_payable", label: "GPD4ACA Pagabili" },
  { key: "wisp", label: "WISP" },
  { key: "pa_create_position", label: "paCreatePosition" },
  { key: "pa_create_position_payable", label: "paCreatePosition Pagabili" },
];

function CategoryCard({ label, total, payable }: { label: string; total: number; payable?: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="font-semibold text-[13px] text-text">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[13px]">
          <span className="text-text-muted">Totale</span>
          <span className="font-mono font-medium text-text">{fmtNumberIt(total)}</span>
        </div>
        {payable !== undefined && (
          <div className="flex justify-between text-[13px]">
            <span className="text-text-muted">Pagabili</span>
            <span className="font-mono font-medium text-text">{fmtNumberIt(payable)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function findClosestIndex(items: GpdPositionSnapshot[], targetTime: number): number {
  let closest = 0;
  let closestDiff = Math.abs(new Date(items[0].report_date).getTime() - targetTime);
  for (let i = 1; i < items.length; i++) {
    const diff = Math.abs(new Date(items[i].report_date).getTime() - targetTime);
    if (diff < closestDiff) {
      closest = i;
      closestDiff = diff;
    }
  }
  return closest;
}

export default function GpdPositionsPage() {
  const { data, isLoading } = useGpdPositionSnapshots();
  const sync = useSyncGpdPositions();
  const [period, setPeriod] = useState<PeriodKey>("30");

  const items = useMemo(() => data?.items ?? [], [data]);
  const syncStatus = data?.sync_status ?? null;
  const latest = items.length > 0 ? items[items.length - 1] : null;

  const filteredItems = useMemo(() => {
    const periodDef = PERIODS.find((p) => p.key === period)!;
    if (periodDef.days === null) return items;
    const cutoff = Date.now() - periodDef.days * 24 * 60 * 60 * 1000;
    return items.filter((s) => new Date(s.report_date).getTime() >= cutoff);
  }, [items, period]);

  const [dateAIndex, setDateAIndex] = useState<number | null>(null);
  const [dateBIndex, setDateBIndex] = useState<number | null>(null);

  const defaultIndices = useMemo(() => {
    if (items.length === 0) return null;
    const lastIndex = items.length - 1;
    const sevenDaysBefore = new Date(items[lastIndex].report_date).getTime() - 7 * 24 * 60 * 60 * 1000;
    const aIndex = findClosestIndex(items, sevenDaysBefore);
    return { a: aIndex, b: lastIndex };
  }, [items]);

  const effectiveAIndex = dateAIndex ?? defaultIndices?.a ?? null;
  const effectiveBIndex = dateBIndex ?? defaultIndices?.b ?? null;

  const snapshotA = effectiveAIndex !== null ? items[effectiveAIndex] : null;
  const snapshotB = effectiveBIndex !== null ? items[effectiveBIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Posizioni Debitorie GPD</h1>
        <div className="flex items-center gap-3">
          {syncStatus && (
            <span className="text-[12px] text-text-muted font-mono">
              Ultimo sync: {fmtDateTime(syncStatus.synced_at)}
            </span>
          )}
          <Gate action="sync:trigger">
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[12px] px-3 py-1 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sync.isPending ? "⏳ Sync in corso…" : "↻ Sync"}
            </button>
          </Gate>
        </div>
      </div>

      {sync.isError && (
        <p className="text-[13px] text-danger">
          Sync fallito: lo snapshot precedente resta valido.
        </p>
      )}

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : !latest ? (
        <p className="text-text-muted text-[13px]">Nessuno snapshot disponibile.</p>
      ) : (
        <>
          {/* KPI principale */}
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6 flex flex-col gap-1">
            <span className="text-[11px] text-text-muted font-mono uppercase" style={{ letterSpacing: ".06em" }}>
              Totale Posizioni Debitorie
            </span>
            <span className="text-3xl font-semibold text-text">{fmtNumberIt(latest.total)}</span>
            <span className="text-[12px] text-text-muted">Aggiornato al {fmtDate(latest.report_date)}</span>
          </div>

          {/* Breakdown per categoria */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <CategoryCard label="GPD" total={latest.gpd} payable={latest.gpd_payable} />
            <CategoryCard label="GPD4ACA" total={latest.gpd4aca} payable={latest.gpd4aca_payable} />
            <CategoryCard label="paCreatePosition" total={latest.pa_create_position} payable={latest.pa_create_position_payable} />
            <CategoryCard label="WISP" total={latest.wisp} />
          </div>

          {/* Trend storico */}
          <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-[13px] text-text">Andamento Totale</p>
              <div className="flex gap-1 border-b border-border">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className="px-3 py-1 text-[12px] transition-colors border-b-2 -mb-px"
                    style={{
                      borderColor: period === p.key ? "var(--accent)" : "transparent",
                      color: period === p.key ? "var(--accent)" : "var(--text-dim)",
                      fontWeight: period === p.key ? 500 : 400,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <LineChart points={filteredItems.map((s) => ({ date: s.report_date, value: s.total }))} />
          </div>

          {/* Confronta periodi */}
          {snapshotA && snapshotB && (
            <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
              <p className="font-semibold text-[13px] text-text">Confronta periodi</p>
              <div className="flex gap-3 flex-wrap">
                <label className="flex flex-col gap-1 text-[12px] text-text-muted">
                  Data A
                  <select
                    value={effectiveAIndex ?? 0}
                    onChange={(e) => setDateAIndex(Number(e.target.value))}
                    className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
                  >
                    {items.map((s, i) => (
                      <option key={s.report_date} value={i}>{fmtDate(s.report_date)}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-text-muted">
                  Data B
                  <select
                    value={effectiveBIndex ?? 0}
                    onChange={(e) => setDateBIndex(Number(e.target.value))}
                    className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
                  >
                    {items.map((s, i) => (
                      <option key={s.report_date} value={i}>{fmtDate(s.report_date)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-[var(--radius)] border border-border overflow-hidden">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-hover">
                      <th className="px-3 py-2 text-left text-text-muted font-medium">Metrica</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">{fmtDate(snapshotA.report_date)}</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">{fmtDate(snapshotB.report_date)}</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Δ assoluto</th>
                      <th className="px-3 py-2 text-right text-text-muted font-medium">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map((m) => {
                      const valA = snapshotA[m.key] as number;
                      const valB = snapshotB[m.key] as number;
                      const delta = valB - valA;
                      const deltaPct = valA !== 0 ? (delta / valA) * 100 : 0;
                      const color = delta > 0 ? "var(--success)" : delta < 0 ? "var(--danger)" : "var(--text-muted)";
                      const sign = delta > 0 ? "+" : "";
                      return (
                        <tr key={m.key} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text-dim">{m.label}</td>
                          <td className="px-3 py-2 text-right font-mono text-text">{fmtNumberIt(valA)}</td>
                          <td className="px-3 py-2 text-right font-mono text-text">{fmtNumberIt(valB)}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color }}>{sign}{fmtNumberIt(delta)}</td>
                          <td className="px-3 py-2 text-right font-mono" style={{ color }}>{sign}{deltaPct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
