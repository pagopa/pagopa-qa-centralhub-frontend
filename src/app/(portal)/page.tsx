import { Chip } from "@/components/primitives/Chip";
import { Kpi } from "@/components/primitives/Kpi";
import { SegBar } from "@/components/primitives/SegBar";
import { Sparkline } from "@/components/primitives/Sparkline";

// Placeholder data — will be replaced by API calls in Sprint 1
const KPI_DATA = [
  { label: "Pass Rate (7d)",   value: "94.2%",  delta: 1.4,  status: "success" as const, trend: [88,90,91,89,93,94,94] },
  { label: "Flaky Tests",      value: "7",      delta: -2,   status: "warning" as const, trend: [12,10,11,9,8,9,7] },
  { label: "Open P1 Bugs",     value: "3",      delta: 0,    status: "danger"  as const, trend: [5,4,4,3,3,3,3] },
  { label: "Coverage",         value: "78.6%",  delta: 0.8,  status: "info"    as const, trend: [74,75,76,77,77,78,79] },
];

const RECENT_RUNS = [
  { id: "run-1241", suite: "E2E · Checkout", env: "UAT",  branch: "main",    status: "passed"  as const, passed: 142, failed: 0,  flaky: 2, skipped: 3, duration: "4m 12s", ago: "8m ago"  },
  { id: "run-1240", suite: "E2E · Auth",     env: "UAT",  branch: "main",    status: "flaky"   as const, passed: 55,  failed: 0,  flaky: 3, skipped: 1, duration: "1m 48s", ago: "22m ago" },
  { id: "run-1239", suite: "E2E · API",      env: "PROD", branch: "release", status: "passed"  as const, passed: 88,  failed: 0,  flaky: 0, skipped: 5, duration: "2m 30s", ago: "1h ago"  },
  { id: "run-1238", suite: "E2E · Payments", env: "UAT",  branch: "feat/3ds", status: "failed" as const, passed: 63,  failed: 7,  flaky: 1, skipped: 2, duration: "3m 05s", ago: "2h ago"  },
  { id: "run-1237", suite: "E2E · Checkout", env: "UAT",  branch: "main",    status: "passed"  as const, passed: 141, failed: 0,  flaky: 3, skipped: 3, duration: "4m 09s", ago: "3h ago"  },
];

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-[var(--gap)]">

      {/* KPI row */}
      <div className="grid gap-[var(--gap)]" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {KPI_DATA.map((k) => (
          <Kpi key={k.label} label={k.label} value={k.value} delta={k.delta} status={k.status}>
            <Sparkline data={k.trend} color={
              k.status === "success" ? "var(--success)" :
              k.status === "danger"  ? "var(--danger)"  :
              k.status === "warning" ? "var(--warning)" :
              "var(--info)"
            } />
          </Kpi>
        ))}
      </div>

      {/* Recent runs */}
      <div
        className="rounded-[var(--radius)] bg-surface border border-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-center justify-between px-[var(--pad)] py-3 border-b border-border">
          <span className="font-semibold text-[13px] text-text">Recent runs</span>
          <span className="text-[12px] text-text-muted font-mono">placeholder data</span>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-subtle border-b border-border">
              <th className="text-left px-[var(--pad)] py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>Run</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>Suite</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>Status</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>Distribution</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>Duration</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted font-mono text-[11px] uppercase" style={{ letterSpacing: ".05em" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_RUNS.map((run) => (
              <tr key={run.id} className="border-b border-border last:border-0 hover:bg-subtle transition-colors">
                <td className="px-[var(--pad)] py-3 font-mono text-text-muted text-[12px]">{run.id}</td>
                <td className="px-3 py-3">
                  <div className="font-medium text-text">{run.suite}</div>
                  <div className="text-text-muted text-[12px] font-mono">{run.env} · {run.branch}</div>
                </td>
                <td className="px-3 py-3">
                  <Chip variant="status" value={run.status} />
                </td>
                <td className="px-3 py-3 min-w-[120px]">
                  <SegBar passed={run.passed} failed={run.failed} flaky={run.flaky} skipped={run.skipped} />
                  <div className="text-text-muted text-[11px] font-mono mt-1">
                    {run.passed}p · {run.failed}f · {run.flaky}k
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-[12px] text-text-dim">{run.duration}</td>
                <td className="px-3 py-3 font-mono text-[12px] text-text-muted">{run.ago}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

