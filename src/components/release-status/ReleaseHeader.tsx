import Link from "next/link";
import { CircleAlert, Clock, Info, RefreshCw, Settings2, TriangleAlert } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Gate } from "@/lib/permissions";
import { syncLabel } from "@/lib/release-status";
import { formatDateTime } from "@/components/release-status/format";
import type { SyncStatus } from "@/types/release-status";

interface ReleaseHeaderProps {
  sync: SyncStatus | null;
  syncInProgress: boolean;
  onSync: () => void;
  syncError: unknown;
}

function syncErrorMessage(error: unknown): { text: string; tone: "warning" | "danger" } {
  if (error instanceof ApiError) {
    if (error.status === 409) return { text: "Sincronizzazione già in corso", tone: "warning" };
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string" && detail) return { text: detail, tone: "danger" };
  }
  return { text: "Impossibile avviare la sincronizzazione", tone: "danger" };
}

function staleReason(sync: SyncStatus | null): string {
  if (!sync) return "Nessuna sincronizzazione eseguita finora.";
  if (sync.status === "FAILED") return "L'ultima sincronizzazione non è riuscita.";
  return "L'ultimo aggiornamento riuscito risale a più di 45 minuti fa.";
}

export function ReleaseHeader({ sync, syncInProgress, onSync, syncError }: ReleaseHeaderProps) {
  const label = syncLabel(sync, new Date());
  const error = syncError ? syncErrorMessage(syncError) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-text">Release Status</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className={`size-3.5 ${syncInProgress ? "animate-pulse text-accent" : ""}`} aria-hidden="true" />
            <span>{label.text}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Gate action="manage:status_page">
            <Link
              href="/releases/catalog"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text transition-colors hover:bg-hover"
            >
              <Settings2 className="size-4 text-text-dim" aria-hidden="true" />
              Gestisci catalogo
            </Link>
          </Gate>
          <Gate action="sync:trigger">
            <button
              type="button"
              onClick={onSync}
              disabled={syncInProgress}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${syncInProgress ? "animate-spin" : ""}`} aria-hidden="true" />
              {syncInProgress ? "Sincronizzazione…" : "Sincronizza ora"}
            </button>
          </Gate>
        </div>
      </div>

      {error && (
        <div
          role={error.tone === "danger" ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
            error.tone === "danger"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-warning/30 bg-warning-soft text-warning"
          }`}
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span>{error.text}</span>
        </div>
      )}

      {label.stale && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Dati non aggiornati</p>
            <p className="mt-0.5 text-xs">
              {staleReason(sync)}
              {sync?.last_success_at && ` · Ultimo aggiornamento riuscito: ${formatDateTime(sync.last_success_at)}`}
            </p>
          </div>
        </div>
      )}

      {sync?.status === "PARTIAL" && sync.reads_failed > 0 && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-2.5 text-sm text-info"
        >
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>{sync.reads_failed === 1 ? "1 lettura non riuscita" : `${sync.reads_failed} letture non riuscite`}</span>
        </div>
      )}
    </div>
  );
}
