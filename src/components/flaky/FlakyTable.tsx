"use client";

import type { FlakyHint, FlakyScenarioRow } from "@/types/flaky";
import { FlakinessLevel } from "./FlakinessLevel";
import { formatFlakyDate, formatFlakyRate, OUTCOME_LABELS } from "./flakyFormat";
import { OutcomeStrip } from "./OutcomeStrip";

const HINT_CHIPS: Record<FlakyHint, { label: string; className: string }> = {
  to_mark: { label: "Da marcare", className: "bg-danger-soft text-danger" },
  to_unmark: { label: "Da smarcare", className: "bg-success-soft text-success" },
  broken: { label: "Rotto: apri bug", className: "bg-neutral-soft text-text" },
};

// 3px bar on the first cell: red = to mark, green = to unmark, dark grey = broken.
const HINT_BAR: Record<FlakyHint, string> = {
  to_mark: "shadow-[inset_3px_0_0_var(--danger)]",
  to_unmark: "shadow-[inset_3px_0_0_var(--success)]",
  broken: "shadow-[inset_3px_0_0_var(--text-dim)]",
};

const COLUMNS = ["Flakiness", "Scenario", "Ultime run", "Flip", "Pass on retry", "Run", "Ultimo KO", "Flag", "Marcato da", "Hint"];

export function rowKey(row: FlakyScenarioRow): string {
  return `${row.test_object}|${row.test_type}|${row.scenario_name}`;
}

export function FlakyTable({
  rows,
  canManage,
  onToggleFlag,
  onRowClick,
}: {
  rows: FlakyScenarioRow[];
  canManage: boolean;
  onToggleFlag: (row: FlakyScenarioRow, next: boolean) => void;
  onRowClick: (row: FlakyScenarioRow) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} className="border-b border-border bg-bg px-3 py-2 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-text-muted uppercase">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-text-dim">
                  Nessuno scenario per i filtri selezionati
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr
                key={rowKey(row)}
                data-hint={row.hint ?? undefined}
                onClick={() => onRowClick(row)}
                className="cursor-pointer border-b border-border last:border-b-0 hover:bg-bg"
              >
                <td className={`px-3 py-2 ${row.hint ? HINT_BAR[row.hint] : ""}`}>
                  <FlakinessLevel level={row.level} score={row.score} state={row.state} />
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-text">{row.scenario_name}</div>
                  <div className="text-xs text-text-muted">{row.test_object} · {row.test_type}</div>
                </td>
                <td className="px-3 py-2"><OutcomeStrip outcomes={row.recent_outcomes} /></td>
                <td className="px-3 py-2 font-mono text-xs">{formatFlakyRate(row.flip_rate)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatFlakyRate(row.retry_pass_rate)}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.runs_analyzed}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-text-dim">
                  {row.last_failure_at ? formatFlakyDate(row.last_failure_at) : "—"}
                </td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.is_flaky}
                    aria-label={`Flaky: ${row.scenario_name}`}
                    disabled={!canManage}
                    onClick={() => onToggleFlag(row, !row.is_flaky)}
                    className={`relative inline-block h-[17px] w-[30px] rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      row.is_flaky ? "bg-warning" : "bg-border-strong"
                    }`}
                  >
                    <span className={`absolute top-0.5 size-[13px] rounded-full bg-white transition-all ${row.is_flaky ? "left-[15px]" : "left-0.5"}`} />
                  </button>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-text-dim">
                  {row.is_flaky && row.flagged_by
                    ? `${row.flagged_by}${row.flagged_at ? ` · ${formatFlakyDate(row.flagged_at)}` : ""}`
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  {row.hint ? (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${HINT_CHIPS[row.hint].className}`}>
                      {HINT_CHIPS[row.hint].label}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim">
        <span><span className="mr-1 inline-block h-3 w-1 bg-success align-middle" />{OUTCOME_LABELS.P}</span>
        <span><span className="mr-1 inline-block h-3 w-1 bg-warning align-middle" />{OUTCOME_LABELS.R}</span>
        <span><span className="mr-1 inline-block h-3 w-1 bg-danger align-middle" />{OUTCOME_LABELS.F}</span>
        <span>Barra rossa: alto livello senza flag · verde: flag su scenario ormai stabile · grigio scuro: rotto</span>
        <span>Click su una riga per lo storico delle run</span>
      </p>
    </div>
  );
}
