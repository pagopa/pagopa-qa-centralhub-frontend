"use client";

import { Chip } from "@/components/primitives/Chip";
import type { E2eRun, E2eSuite, E2eRunStatus } from "@/types/index";

interface SuiteCardProps {
  suite: E2eSuite;
  latestRun: E2eRun | null;
  onClick: () => void;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  return isToday
    ? `oggi ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

export function SuiteCard({ suite, latestRun, onClick }: SuiteCardProps) {
  const total = latestRun
    ? latestRun.passed + latestRun.failed + latestRun.skipped
    : 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-[6px] rounded-[var(--radius)] bg-surface border border-border text-left cursor-pointer"
      style={{
        padding: "var(--pad)",
        minWidth: 130,
        boxShadow: "var(--shadow-sm)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--hover)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface)")}
    >
      <span className="font-semibold text-[13px] text-text">{suite.display_name}</span>
      {latestRun ? (
        <>
          <Chip variant="status" value={latestRun.status as E2eRunStatus} />
          <span className="font-mono text-[11px] text-text-muted">
            {latestRun.passed}/{total}
          </span>
          <span className="text-[11px] text-text-muted">{fmtDate(latestRun.run_at)}</span>
        </>
      ) : (
        <span className="text-[11px] text-text-muted">Nessun run</span>
      )}
    </button>
  );
}
