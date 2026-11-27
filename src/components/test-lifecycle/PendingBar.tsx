"use client";

import { useIsMutating } from "@tanstack/react-query";
import { useSlowPending } from "@/hooks/useSlowPending";

/**
 * Feedback for slow saves and actions. When a request lasts more than a moment a thin bar runs
 * along the top of the page; if it keeps going a small note says that it is taking longer.
 * Quick operations show nothing.
 */
export function PendingBar() {
  const busy = useIsMutating() > 0;
  const slow = useSlowPending(busy, 400);
  const verySlow = useSlowPending(busy, 3400);
  if (!slow) return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="h-[3px] w-full overflow-hidden" style={{ background: "var(--accent-soft)" }}>
        <div className="tl-pending-bar h-full w-1/3 rounded-full" style={{ background: "var(--accent)" }} />
      </div>
      <span className="sr-only">Operazione in corso…</span>
      <div
        className="mx-auto mt-2 w-fit rounded-full border border-border bg-surface px-3 py-1 font-mono text-[12px] text-text-muted shadow-[var(--shadow-sm)]"
        style={{ marginLeft: "calc(var(--sidebar-w) + 24px)" }}
      >
        {verySlow ? "Sta richiedendo più tempo del solito, non chiudere la pagina…" : "Operazione in corso…"}
      </div>
    </div>
  );
}
