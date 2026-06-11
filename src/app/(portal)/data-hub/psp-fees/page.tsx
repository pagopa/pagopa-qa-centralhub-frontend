"use client";

import { useState } from "react";
import { usePspFees, useSyncPspFees } from "@/hooks/usePspFees";
import {
  PspFeeFilters,
  type PspFeeFiltersState,
  DEFAULT_PSP_FEE_FILTERS,
} from "@/components/psp-fees/PspFeeFilters";
import { PspFeeTable } from "@/components/psp-fees/PspFeeTable";
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

export default function PspFeesPage() {
  const [filters, setFilters] = useState<PspFeeFiltersState>(DEFAULT_PSP_FEE_FILTERS);
  const { data, isLoading } = usePspFees();
  const sync = useSyncPspFees();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">PSP Commissioni</h1>
        <div className="flex items-center gap-3">
          {data?.sync_status && (
            <span className="text-text-muted text-[12px]">
              Ultimo sync: {fmtDateTime(data.sync_status.synced_at)}
            </span>
          )}
          <Gate action="sync:trigger">
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sync.isPending ? "⏳ Sync in corso…" : "↻ Sync"}
            </button>
          </Gate>
        </div>
      </div>

      {sync.isError && (
        <p className="text-danger text-[13px]">Errore durante il sync. Riprova più tardi.</p>
      )}

      <PspFeeFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : (
        <PspFeeTable items={data?.items ?? []} filters={filters} />
      )}
    </div>
  );
}
