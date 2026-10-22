"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip } from "@/components/primitives/Chip";
import { buildAllureRunUrl } from "@/utils/nrtUtils";
import type { E2eRunWithSuite, TestRun, TestSuite } from "@/types/index";

interface RunModalProps {
  run: E2eRunWithSuite | { test_run: TestRun; test_suite: TestSuite } | null;
  open: boolean;
  onClose: () => void;
  reportUrl?: string;
  reportTitle?: string;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function RunModal({ run, open, onClose, reportUrl, reportTitle = "Allure report" }: RunModalProps) {
  if (!run) return null;

  const isNrt = "test_run" in run;
  const suiteName = isNrt ? run.test_suite.test_object : run.suite_display_name;
  const runAt = isNrt ? run.test_run.timestamp_start : run.run_at;
  const passed = isNrt ? run.test_run.passed_scenario : run.passed;
  const failed = isNrt ? run.test_run.failed_scenario : run.failed;
  const skipped = isNrt ? run.test_run.skipped_scenario : run.skipped;
  const durationMs = isNrt ? run.test_run.duration_ms : run.duration_ms;
  const allureUrl = reportUrl ?? (isNrt
    ? run.test_run.allure_url ?? (
        run.test_run.timestamp_start
          ? buildAllureRunUrl(run.test_run, run.test_suite.test_object)
          : null
      )
    : run.allure_url);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        style={{
          width: "90vw",
          maxWidth: "90vw",
          height: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base">
            <span>{reportTitle} — {suiteName}</span>
            <span className="text-text-muted font-normal text-[13px]">
              {runAt ? new Date(runAt).toLocaleString("it-IT") : "—"}
            </span>
            {!isNrt && <Chip variant="status" value={run.status} />}
          </DialogTitle>
        </DialogHeader>

        {/* Stats row */}
        <div className="flex gap-4 text-[13px] pb-3 border-b border-border">
          <span className="text-success font-mono">✓ {passed ?? "—"} passed</span>
          <span className="text-danger font-mono">✗ {failed ?? "—"} failed</span>
          {isNrt && <span className="text-warning font-mono">{run.test_run.broken_scenario ?? "—"} broken</span>}
          <span className="text-text-muted font-mono">⏭ {skipped ?? "—"} skip</span>
          <span className="text-text-dim font-mono ml-auto">⏱ {durationMs == null ? "—" : fmtDuration(durationMs)}</span>
        </div>

        {/* Allure iframe */}
        <div className="flex-1 min-h-0 relative">
          {allureUrl ? <iframe
            src={allureUrl}
            className="w-full h-full rounded-[var(--radius-sm)] border border-border"
            title={`${reportTitle} — ${suiteName}`}
          /> : <p className="text-[13px] text-text-muted">Report Allure non disponibile.</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          {allureUrl && <a
            href={allureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-accent hover:underline"
          >
            ↗ Apri in nuova tab
          </a>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
