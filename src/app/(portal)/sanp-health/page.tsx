"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Kpi } from "@/components/primitives/Kpi";
import { SanpHealthMatrix } from "@/components/sanp-health/SanpHealthMatrix";
import {
  useLatestSanpHealthReport,
  useSanpHealthReport,
  useSanpHealthReports,
  useSanpHealthSyncStatus,
  useSyncSanpHealth,
} from "@/hooks/useSanpHealth";
import { calculateSanpHealthKpis } from "@/lib/sanp-health";
import { Gate } from "@/lib/permissions";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Impossibile caricare SANP Health";
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </div>
  );
}

function StaleDataWarning({ reason, lastSuccessAt }: { reason: string; lastSuccessAt?: string | null }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Dati non aggiornati</p>
        <p className="mt-0.5 text-xs">
          {reason}
          {lastSuccessAt && ` · Ultimo aggiornamento riuscito: ${formatDateTime(lastSuccessAt)}`}
        </p>
      </div>
    </div>
  );
}

function SyncButton({ onClick, isPending }: { onClick: () => void; isPending: boolean }) {
  return (
    <Gate action="sync:trigger">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        {isPending ? "Sincronizzazione…" : "Sincronizza ora"}
      </button>
    </Gate>
  );
}

export default function SanpHealthPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const reportsQuery = useSanpHealthReports();
  const latestQuery = useLatestSanpHealthReport();
  const selectedQuery = useSanpHealthReport(selectedRunId);
  const syncStatusQuery = useSanpHealthSyncStatus();
  const sync = useSyncSanpHealth();

  const reports = reportsQuery.data?.items ?? [];
  const selectedRunAvailable = selectedRunId === null
    || reports.some((report) => report.id === selectedRunId);
  const effectiveSelectedRunId = selectedRunAvailable ? selectedRunId : null;
  const latestDetail = latestQuery.data?.report ?? null;
  const selectedDetail = effectiveSelectedRunId ? selectedQuery.data ?? null : latestDetail;
  const selectedReport = selectedDetail?.report ?? null;
  const isLoading = reportsQuery.isLoading
    || latestQuery.isLoading
    || (effectiveSelectedRunId !== null && selectedQuery.isLoading);
  const fatalError = reportsQuery.error
    ?? latestQuery.error
    ?? (effectiveSelectedRunId !== null ? selectedQuery.error : null);
  const kpis = calculateSanpHealthKpis(selectedDetail?.items ?? []);
  const syncStatus = syncStatusQuery.data;

  if (isLoading) {
    return <p className="text-sm text-text-muted">Caricamento SANP Health…</p>;
  }

  if (fatalError) {
    return <ErrorMessage error={fatalError} />;
  }

  if (!selectedDetail || !selectedReport) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">SANP Health</h1>
          <SyncButton onClick={() => sync.mutate()} isPending={sync.isPending} />
        </div>
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
          Nessun report SANP Health disponibile
        </p>
        {syncStatus?.last_error && (
          <StaleDataWarning reason={syncStatus.last_error} lastSuccessAt={syncStatus.last_success_at} />
        )}
        {sync.isError && <ErrorMessage error={sync.error} />}
      </div>
    );
  }

  const latestRunId = latestDetail?.report.id ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text">SANP Health</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
            <time dateTime={selectedReport.completed_at}>{formatDateTime(selectedReport.completed_at)}</time>
            {selectedDetail.sanp_version && (
              <span className="font-mono font-medium text-text-dim">SANP {selectedDetail.sanp_version}</span>
            )}
            <a
              href={selectedReport.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              Run GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-text-muted sm:flex-initial">
            <span>Report</span>
            <select
              aria-label="Report"
              value={selectedRunId ?? latestRunId ?? ""}
              onChange={(event) => setSelectedRunId(
                event.target.value === latestRunId ? null : event.target.value,
              )}
              className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-52"
            >
              {(reportsQuery.data?.items ?? []).map((report) => (
                <option key={report.id} value={report.id}>
                  Run #{report.run_number} · {report.import_status}
                </option>
              ))}
            </select>
          </label>

          <SyncButton onClick={() => sync.mutate()} isPending={sync.isPending} />
        </div>
      </div>

      {latestQuery.data?.is_stale && (
        <StaleDataWarning
          reason={latestQuery.data.stale_reason ?? syncStatus?.last_error ?? "L'ultima sincronizzazione non è riuscita."}
          lastSuccessAt={syncStatus?.last_success_at}
        />
      )}

      {selectedReport.import_status === "partial" && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Report incompleto</p>
            {selectedReport.error_message && <p className="mt-0.5 text-xs">{selectedReport.error_message}</p>}
          </div>
        </div>
      )}

      {selectedReport.import_status === "failed" && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Report non disponibile</p>
            {selectedReport.error_message && <p className="mt-0.5 text-xs">{selectedReport.error_message}</p>}
          </div>
        </div>
      )}

      {sync.isError && <ErrorMessage error={sync.error} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi label="API monitorate" value={kpis.monitoredApis} />
        <Kpi label="API con errori" value={kpis.apisWithErrors} status="danger" />
        <Kpi label="Errori" value={kpis.errors} status="danger" />
        <Kpi label="Warning" value={kpis.warnings} status="warning" />
        <Kpi label="Info" value={kpis.info} status="info" />
      </div>

      <SanpHealthMatrix rows={selectedDetail.items} />
    </div>
  );
}