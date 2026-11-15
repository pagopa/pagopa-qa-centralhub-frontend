"use client";

import { X } from "lucide-react";
import { useFlakyHistory } from "@/hooks/useFlaky";
import type { FlakyHistoryItem, FlakyScenarioRow } from "@/types/flaky";
import { FlakinessLevel } from "./FlakinessLevel";
import { formatFlakyDate, formatFlakyRate, OUTCOME_LABELS } from "./flakyFormat";

const OUTCOME_DOT = { P: "bg-success", R: "bg-warning", F: "bg-danger" } as const;

function reportHref(item: FlakyHistoryItem): string {
  return item.test_origin === "TAS" ? `/tas-nrts/report/${item.run_id}` : `/nrts/report/${item.run_id}`;
}

export function FlakyScenarioPanel({
  row,
  canManage,
  onClose,
  onToggleFlag,
}: {
  row: FlakyScenarioRow | null;
  canManage: boolean;
  onClose: () => void;
  onToggleFlag: (row: FlakyScenarioRow, next: boolean) => void;
}) {
  const history = useFlakyHistory(
    row ? { env: row.env, test_object: row.test_object, test_type: row.test_type, scenario_name: row.scenario_name } : null,
  );
  if (!row) return null;

  return (
    <aside
      role="dialog"
      aria-label={`Dettaglio ${row.scenario_name}`}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-lg"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{row.scenario_name}</h2>
          <p className="text-xs text-text-muted">{row.test_object} · {row.test_type} · {row.env}</p>
        </div>
        <button type="button" aria-label="Chiudi" onClick={onClose} className="rounded-md p-1 text-text-dim hover:bg-bg">
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2"><dt className="text-xs text-text-dim">Flakiness</dt><dd><FlakinessLevel level={row.level} score={row.score} state={row.state} /></dd></div>
        <div><dt className="text-xs text-text-dim">Flip rate</dt><dd className="font-mono">{formatFlakyRate(row.flip_rate)}</dd></div>
        <div><dt className="text-xs text-text-dim">Pass on retry</dt><dd className="font-mono">{formatFlakyRate(row.retry_pass_rate)}</dd></div>
        <div><dt className="text-xs text-text-dim">Run analizzate</dt><dd className="font-mono">{row.runs_analyzed}</dd></div>
        <div>
          <dt className="text-xs text-text-dim">Flag flaky</dt>
          <dd className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={row.is_flaky}
              aria-label={`Flaky: ${row.scenario_name}`}
              disabled={!canManage}
              onClick={() => onToggleFlag(row, !row.is_flaky)}
              className={`relative inline-block h-[17px] w-[30px] rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${row.is_flaky ? "bg-warning" : "bg-border-strong"}`}
            >
              <span className={`absolute top-0.5 size-[13px] rounded-full bg-white transition-all ${row.is_flaky ? "left-[15px]" : "left-0.5"}`} />
            </button>
            {row.is_flaky && row.flagged_by ? <span className="text-xs text-text-dim">{row.flagged_by}</span> : null}
          </dd>
        </div>
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-text-dim uppercase">Storico run (finestra di calcolo)</h3>
        {history.isLoading ? <p className="text-sm text-text-dim">Caricamento…</p> : null}
        {history.data && history.data.length === 0 ? <p className="text-sm text-text-dim">Nessuna run nella finestra</p> : null}
        <ul className="flex flex-col divide-y divide-border">
          {(history.data ?? []).map((item) => (
            <li key={item.run_id} className="flex flex-col gap-1 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`size-2 rounded-full ${OUTCOME_DOT[item.outcome]}`} title={OUTCOME_LABELS[item.outcome]} />
                <span className="font-medium text-text">{formatFlakyDate(item.ts)}</span>
                <span className="text-xs text-text-dim">{item.status}</span>
                {item.retries ? <span className="text-xs text-text-dim">retry {item.retries}</span> : null}
                {item.test_version ? <span className="text-xs text-text-dim">test {item.test_version}</span> : null}
                <span className="ml-auto flex gap-3 text-xs">
                  {item.allure_url ? <a className="text-accent hover:underline" href={item.allure_url} target="_blank" rel="noopener noreferrer">Allure</a> : null}
                  <a className="text-accent hover:underline" href={reportHref(item)}>Run</a>
                </span>
              </div>
              {item.error_message ? <p className="line-clamp-3 font-mono text-xs text-danger">{item.error_message}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
