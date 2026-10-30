"use client";

import { Sparkline } from "@/components/primitives/Sparkline";
import type { TestRun, TestSuite } from "@/types/index";

interface SuiteCardProps {
  suite: TestSuite;
  latestRun: TestRun | null;
  trend: number[];
  onClick: () => void;
}

export function SuiteCard({ suite, latestRun, trend, onClick }: SuiteCardProps) {
  const lastRate = trend.length > 0 ? trend[trend.length - 1] : null;
  const sparkColor =
    lastRate === null ? "var(--accent)"
    : lastRate >= 0.95 ? "var(--success)"
    : lastRate >= 0.7 ? "var(--warning)"
    : "var(--danger)";
  return (
    trend.length >= 2 && (
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
      <span className="font-semibold text-[13px] text-text">{suite.test_object}</span>
      {latestRun ? (
        <>
          <Sparkline data={trend} width={200} height={100} color={sparkColor} area />
        </>
      ) : (
        <span className="text-[11px] text-text-muted">Nessun run</span>
      )}
    </button>
    )
  );
}
