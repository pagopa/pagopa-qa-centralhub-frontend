"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTlGitStatus, useTlGitSync } from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";

function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("it-IT");
}

export function GitSyncButton({ disabled = false }: { disabled?: boolean }) {
  const status = useTlGitStatus();
  const sync = useTlGitSync();
  const [error, setError] = useState<string | null>(null);
  const configured = status.data?.configured ?? false;
  const lastRun = formatTime(status.data?.last_run_at);
  const lastError = status.data?.last_error;

  const run = async () => {
    setError(null);
    try {
      await sync.mutateAsync();
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Sincronizzazione non riuscita.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void run()}
        disabled={disabled || !configured || sync.isPending}
        title={configured ? undefined : "Git non configurato"}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={14} className={sync.isPending ? "animate-spin" : undefined} /> Sincronizza ora
      </button>
      <span className="text-[11px] text-text-muted">
        {!status.isLoading && !configured
          ? "Git non configurato: sync e PR disattivati"
          : lastRun
            ? `Ultimo sync: ${lastRun}`
            : null}
      </span>
      {(error || lastError) && (
        <span role="alert" className="text-[11px]" style={{ color: "var(--danger)" }}>
          {error ?? `Ultimo errore: ${lastError}`}
        </span>
      )}
    </div>
  );
}
