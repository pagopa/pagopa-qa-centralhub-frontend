"use client";

import { RefreshCw } from "lucide-react";
import { useRecomputeFlaky } from "@/hooks/useFlaky";
import { ApiError } from "@/lib/api";

export function FlakyRecomputeButton({ canManage }: { canManage: boolean }) {
  const recompute = useRecomputeFlaky();
  if (!canManage) return null;

  const inProgress = recompute.error instanceof ApiError && recompute.error.status === 409;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => recompute.mutate()}
        disabled={recompute.isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`size-4 ${recompute.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        {recompute.isPending ? "Ricalcolo…" : "Ricalcola ora"}
      </button>
      {inProgress ? (
        <p role="status" className="text-xs text-warning">Ricalcolo in corso, riprova tra poco</p>
      ) : recompute.error ? (
        <p role="alert" className="text-xs text-danger">Ricalcolo non riuscito</p>
      ) : null}
    </div>
  );
}
