"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import { useDeleteE2eRun, useDeleteE2eRunsBulk } from "@/hooks/useE2eRuns";
import type { E2eRunWithSuite, E2eRunStatus, E2eSuite } from "@/types/index";

interface RunTableProps {
  suites: E2eSuite[];
  runs: E2eRunWithSuite[];
  total: number;
  selectedSuiteId: string | undefined;
  onSuiteFilter: (suiteId: string | undefined) => void;
  onRowClick: (run: E2eRunWithSuite) => void;
  onSync: () => void;
  syncing?: boolean;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunTable({
  suites,
  runs,
  total,
  selectedSuiteId,
  onSuiteFilter,
  onRowClick,
  onSync,
  syncing = false,
}: RunTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmSingle, setConfirmSingle] = useState<E2eRunWithSuite | null>(null);

  const deleteSingle = useDeleteE2eRun();
  const deleteBulk = useDeleteE2eRunsBulk();

  const allChecked = runs.length > 0 && selected.size === runs.length;
  const someChecked = selected.size > 0 && !allChecked;

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(runs.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSingle = async (run: E2eRunWithSuite) => {
    await deleteSingle.mutateAsync(run.id);
    setSelected((prev) => { const n = new Set(prev); n.delete(run.id); return n; });
    setConfirmSingle(null);
  };

  const handleDeleteBulk = async () => {
    await deleteBulk.mutateAsync(Array.from(selected));
    setSelected(new Set());
    setConfirmBulk(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Filter + action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
            value={selectedSuiteId ?? ""}
            onChange={(e) => { onSuiteFilter(e.target.value || undefined); setSelected(new Set()); }}
          >
            <option value="">Tutte le suite</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>

          <span className="text-[12px] text-text-muted ml-1">{total} run</span>

          {selected.size > 0 && (
            <button
              onClick={() => setConfirmBulk(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-[12px] rounded-[var(--radius-sm)] border transition-colors"
              style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "color-mix(in oklch, var(--danger) 8%, transparent)" }}
            >
              <Trash2 size={12} />
              Elimina selezionati ({selected.size})
            </button>
          )}

          <button
            onClick={onSync}
            disabled={syncing}
            className="ml-auto rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[12px] px-3 py-1 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "⏳ Sync in corso…" : "↻ Sync"}
          </button>
        </div>

        {/* Table */}
        <div className="rounded-[var(--radius)] border border-border overflow-hidden bg-surface">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Suite</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Data</th>
                <th className="text-right px-4 py-2 font-medium text-text-muted">Pass</th>
                <th className="text-right px-4 py-2 font-medium text-text-muted">Fail</th>
                <th className="text-right px-4 py-2 font-medium text-text-muted">Skip</th>
                <th className="text-right px-4 py-2 font-medium text-text-muted">Durata</th>
                <th className="text-center px-4 py-2 font-medium text-text-muted">Stato</th>
                <th className="text-center px-4 py-2 font-medium text-text-muted">Report</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center px-4 py-8 text-text-muted">
                    Nessun run trovato
                  </td>
                </tr>
              )}
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="group border-b border-border last:border-0 hover:bg-hover cursor-pointer transition-colors"
                  style={selected.has(run.id) ? { background: "color-mix(in oklch, var(--accent) 6%, var(--surface))" } : {}}
                  onClick={() => onRowClick(run)}
                >
                  <td
                    className="px-3 py-2 text-center"
                    onClick={(e) => { e.stopPropagation(); toggleOne(run.id); }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(run.id)}
                      onChange={() => toggleOne(run.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2 font-semibold">{run.suite_display_name}</td>
                  <td className="px-4 py-2 text-text-dim font-mono text-[12px]">
                    {fmtDateTime(run.run_at)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-success">{run.passed}</td>
                  <td className="px-4 py-2 text-right font-mono text-danger">{run.failed}</td>
                  <td className="px-4 py-2 text-right font-mono text-text-muted">{run.skipped}</td>
                  <td className="px-4 py-2 text-right font-mono text-text-dim">
                    {fmtDuration(run.duration_ms)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Chip variant="status" value={run.status as E2eRunStatus} />
                  </td>
                  <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={run.allure_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-[12px] hover:underline"
                    >
                      ⊞ Allure
                    </a>
                  </td>
                  <td
                    className="px-2 py-2 text-center"
                    onClick={(e) => { e.stopPropagation(); setConfirmSingle(run); }}
                  >
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single delete confirm */}
      {confirmSingle && (
        <ConfirmModal
          message={`Eliminare il run del ${fmtDateTime(confirmSingle.run_at)} (${confirmSingle.suite_display_name})?`}
          isPending={deleteSingle.isPending}
          onConfirm={() => handleDeleteSingle(confirmSingle)}
          onCancel={() => setConfirmSingle(null)}
        />
      )}

      {/* Bulk delete confirm */}
      {confirmBulk && (
        <ConfirmModal
          message={`Eliminare ${selected.size} run selezionati? L'operazione non è reversibile.`}
          isPending={deleteBulk.isPending}
          onConfirm={handleDeleteBulk}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </>
  );
}

function ConfirmModal({
  message,
  isPending,
  onConfirm,
  onCancel,
}: {
  message: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className="rounded-[var(--radius)] border border-border bg-surface p-6 flex flex-col gap-4 w-full max-w-sm"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
      >
        <p className="font-semibold text-[14px] text-text">Conferma eliminazione</p>
        <p className="text-[13px] text-text-dim">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] border border-border text-text-dim hover:bg-hover transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] font-medium disabled:opacity-50 transition-colors"
            style={{ background: "var(--danger)", color: "#fff" }}
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}
