"use client";

import { Chip } from "@/components/primitives/Chip";
import type { E2eRunWithSuite, E2eRunStatus, E2eSuite } from "@/types/index";

interface RunTableProps {
  suites: E2eSuite[];
  runs: E2eRunWithSuite[];
  total: number;
  selectedSuiteId: string | undefined;
  onSuiteFilter: (suiteId: string | undefined) => void;
  onRowClick: (run: E2eRunWithSuite) => void;
  onSync: () => void;
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
}: RunTableProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-2 py-1"
          value={selectedSuiteId ?? ""}
          onChange={(e) => onSuiteFilter(e.target.value || undefined)}
        >
          <option value="">Tutte le suite</option>
          {suites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-text-muted ml-1">{total} run</span>
        <button
          onClick={onSync}
          className="ml-auto rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[12px] px-3 py-1 hover:bg-hover transition-colors"
        >
          ↻ Sync
        </button>
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius)] border border-border overflow-hidden bg-surface">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border bg-subtle">
              <th className="text-left px-4 py-2 font-medium text-text-muted">Suite</th>
              <th className="text-left px-4 py-2 font-medium text-text-muted">Data</th>
              <th className="text-right px-4 py-2 font-medium text-text-muted">Pass</th>
              <th className="text-right px-4 py-2 font-medium text-text-muted">Fail</th>
              <th className="text-right px-4 py-2 font-medium text-text-muted">Skip</th>
              <th className="text-right px-4 py-2 font-medium text-text-muted">Durata</th>
              <th className="text-center px-4 py-2 font-medium text-text-muted">Stato</th>
              <th className="text-center px-4 py-2 font-medium text-text-muted">Report</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center px-4 py-8 text-text-muted">
                  Nessun run trovato
                </td>
              </tr>
            )}
            {runs.map((run) => (
              <tr
                key={run.id}
                className="border-b border-border last:border-0 hover:bg-hover cursor-pointer transition-colors"
                onClick={() => onRowClick(run)}
              >
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
                <td
                  className="px-4 py-2 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <a
                    href={run.allure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent text-[12px] hover:underline"
                  >
                    ⊞ Allure
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
