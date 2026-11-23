import { RefreshCw } from "lucide-react";
import { STALE_LOCK_MESSAGE } from "@/lib/test-lifecycle";

/** Shown after a stale_lock 409: local text is kept until the user reloads. */
export function StaleLockBanner({ onReload }: { onReload: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-[13px]"
      style={{ borderColor: "var(--warning)", background: "var(--warning-soft)", color: "var(--text)" }}
    >
      <span>{STALE_LOCK_MESSAGE}</span>
      <button
        type="button"
        onClick={onReload}
        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 py-1 text-[12px] hover:bg-hover"
      >
        <RefreshCw size={12} /> Ricarica
      </button>
    </div>
  );
}
