"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FlakyFilters } from "@/components/flaky/FlakyFilters";
import { FlakyHintBoxes } from "@/components/flaky/FlakyHintBoxes";
import { FlakyHowItWorks } from "@/components/flaky/FlakyHowItWorks";
import { FlakyRecomputeButton } from "@/components/flaky/FlakyRecomputeButton";
import { FlakyScenarioPanel } from "@/components/flaky/FlakyScenarioPanel";
import { FlakyTable, rowKey } from "@/components/flaky/FlakyTable";
import {
  DEFAULT_FLAKY_FILTERS,
  FLAKY_PAGE_SIZE,
  useFlakyRecomputeStatus,
  useFlakyScenarios,
  useFlakySummary,
  useSetFlakyFlag,
} from "@/hooks/useFlaky";
import { usePermissions } from "@/hooks/usePermissions";
import { useSuites } from "@/hooks/useSuites";
import type { FlakyFilters as Filters, FlakyRecomputeStatus, FlakyScenarioRow } from "@/types/flaky";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function lastRecomputeLabel(status: FlakyRecomputeStatus | null | undefined): string {
  if (!status?.last_success_at) return "mai eseguito";
  const how = status.last_trigger === "MANUAL"
    ? `manuale${status.last_requested_by ? `, ${status.last_requested_by}` : ""}`
    : "automatico";
  return `${formatDateTime(status.last_success_at)} (${how})`;
}

export default function FlakyScenariosPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FLAKY_FILTERS);
  const [page, setPage] = useState(1);
  const scenarios = useFlakyScenarios(filters, page);
  const summary = useFlakySummary(filters);
  const status = useFlakyRecomputeStatus();
  const suites = useSuites();
  const setFlag = useSetFlakyFlag();
  const { can } = usePermissions();
  // Optimistic flag values, keyed by scenario, until the list is refetched.
  const [pendingFlags, setPendingFlags] = useState<Record<string, boolean>>({});
  const [flagError, setFlagError] = useState<string | null>(null);
  const [rowsData, setRowsData] = useState(scenarios.data);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const canManage = can("manage:flaky");

  if (rowsData !== scenarios.data) {
    setRowsData(scenarios.data);
    setPendingFlags({});
  }

  const rows: FlakyScenarioRow[] = (scenarios.data?.items ?? []).map((row) => {
    const pending = pendingFlags[rowKey(row)];
    return pending === undefined ? row : { ...row, is_flaky: pending };
  });
  const selectedRow = rows.find((row) => rowKey(row) === selectedKey) ?? null;
  const total = scenarios.data?.total ?? 0;
  const firstShown = total === 0 ? 0 : (page - 1) * FLAKY_PAGE_SIZE + 1;
  const lastShown = Math.min(page * FLAKY_PAGE_SIZE, total);

  function changeFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  function toggleFlag(row: FlakyScenarioRow, next: boolean) {
    const key = rowKey(row);
    setFlagError(null);
    setPendingFlags((current) => ({ ...current, [key]: next }));
    setFlag.mutate(
      { test_object: row.test_object, test_type: row.test_type, scenario_name: row.scenario_name, is_flaky: next },
      {
        onError: () => {
          setPendingFlags((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          setFlagError(`Impossibile aggiornare il flag di ${row.scenario_name}`);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Scenari flaky</h1>
          <p className="mt-1 text-sm text-text-dim">
            Ultimo ricalcolo: <strong>{lastRecomputeLabel(status.data)}</strong>
            {" · "}finestra: ultimi 30 giorni, max 30 run · solo run CRON / CI / TAS
          </p>
        </div>
        <div className="flex items-start gap-2">
          <FlakyHowItWorks />
          <FlakyRecomputeButton canManage={canManage} />
        </div>
      </header>

      <FlakyFilters value={filters} onChange={changeFilters} suites={suites.data ?? []} />

      <FlakyHintBoxes
        summary={summary.data}
        active={filters.hint}
        onToggle={(hint) => changeFilters({ ...filters, hint: filters.hint === hint ? null : hint })}
      />

      {scenarios.error || flagError ? (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {flagError ?? "Impossibile caricare gli scenari flaky"}
        </div>
      ) : null}

      <FlakyTable
        rows={rows}
        canManage={canManage}
        onToggleFlag={toggleFlag}
        onRowClick={(row) => setSelectedKey(rowKey(row))}
      />

      <FlakyScenarioPanel
        row={selectedRow}
        canManage={canManage}
        onClose={() => setSelectedKey(null)}
        onToggleFlag={toggleFlag}
      />

      {total > FLAKY_PAGE_SIZE ? (
        <nav className="flex items-center justify-end gap-2 text-sm text-text-dim" aria-label="Paginazione">
          <span>{firstShown}–{lastShown} di {total}</span>
          <button type="button" aria-label="Pagina precedente" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-md border border-border p-1 disabled:opacity-40">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Pagina successiva" disabled={lastShown >= total} onClick={() => setPage(page + 1)} className="rounded-md border border-border p-1 disabled:opacity-40">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
