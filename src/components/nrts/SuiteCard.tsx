"use client";

import { Chip } from "@/components/primitives/Chip";
import { Sparkline } from "@/components/primitives/Sparkline";
import type { TestRun, TestSuite } from "@/types/index";
import type { E2eRun, E2eRunStatus, E2eSuite } from "@/types/index";

interface SuiteCardProps {
  suite: TestSuite | E2eSuite;
  latestRun: TestRun | E2eRun | null;
  trend: number[];
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

export function SuiteCard({ suite, latestRun, trend, onClick }: SuiteCardProps) {
  const lastRate = trend.length > 0 ? trend[trend.length - 1] : null;
  const sparkColor =
    lastRate === null ? "var(--accent)"
    : lastRate >= 0.95 ? "var(--success)"
    : lastRate >= 0.7 ? "var(--warning)"
    : "var(--danger)";
  const isE2e = "display_name" in suite;
  const suiteName = isE2e ? suite.display_name : suite.test_object;
  const e2eRun = latestRun && "passed" in latestRun ? latestRun : null;
  const testRun = latestRun && "passed_scenario" in latestRun ? latestRun : null;
  const total = e2eRun ? e2eRun.passed + e2eRun.failed + e2eRun.skipped : 0;

  return (
   (trend.length >= 2 && (
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
      <span className="font-semibold text-[13px] text-text">{suiteName}</span>
      {isE2e ? (
        e2eRun ? (
          <>
            <Chip variant="status" value={e2eRun.status as E2eRunStatus} />
            <span className="font-mono text-[11px] text-text-muted">
              {e2eRun.passed}/{total}
            </span>
            <span className="text-[11px] text-text-muted">{fmtDate(e2eRun.run_at)}</span>
            {trend.length >= 2 && (
              <Sparkline data={trend} width={110} height={24} color={sparkColor} area />
            )}
          </>
        ) : (
          <span className="text-[11px] text-text-muted">Nessun run</span>
        )
      ) : testRun ? (
        <>
          {trend.length >= 2 && (
            <Sparkline data={trend} width={200} height={100} color={sparkColor} area />
          )}
        </>
      ) : (
        <span className="text-[11px] text-text-muted">Nessun run</span>
      )}
    </button>
   ))
  );
}
