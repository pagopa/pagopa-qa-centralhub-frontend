"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NrtsListObject } from "@/types";
import { buildAllureRunUrl } from "@/utils/nrtUtils";

interface RunModalProps {
  run: NrtsListObject | null;
  open: boolean;
  onClose: () => void;
  reportUrl?: string;
  reportTitle?: string;
  isTasOnly: boolean;
}

function fmtDuration(durationMs: number | null): string {
  if (durationMs == null) return "—";

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function RunModal({
  run,
  open,
  onClose,
  reportUrl,
  reportTitle = "Allure report",
  isTasOnly,
}: RunModalProps) {
  if (!run) return null;

  const { test_run: testRun, test_suite: suite } = run;
  const allureUrl = reportUrl ?? testRun.allure_url ?? (
    testRun.timestamp_start
      ? buildAllureRunUrl(testRun, suite.test_object, isTasOnly)
      : null
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="flex h-[88vh] w-[90vw] max-w-none flex-col overflow-hidden"
        style={{ width: "90vw", maxWidth: "90vw", height: "88vh" }}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3 text-base">
            <span>{reportTitle} — {suite.test_object}</span>
            <span className="text-[13px] font-normal text-text-muted">
              {testRun.timestamp_start
                ? new Date(testRun.timestamp_start).toLocaleString("it-IT")
                : "—"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 border-b border-border pb-3 text-[13px]">
          <span className="font-mono text-success">✓ {testRun.passed_scenario ?? "—"} passed</span>
          <span className="font-mono text-danger">✗ {testRun.failed_scenario ?? "—"} failed</span>
          <span className="font-mono text-warning">{testRun.broken_scenario ?? "—"} broken</span>
          <span className="font-mono text-text-muted">{testRun.skipped_scenario ?? "—"} skipped</span>
          <span className="ml-auto font-mono text-text-dim">
            {fmtDuration(testRun.duration_ms)}
          </span>
        </div>

        <div className="relative min-h-0 flex-1">
          {allureUrl ? (
            <iframe
              src={allureUrl}
              className="h-full w-full rounded-[var(--radius-sm)] border border-border"
              title={`${reportTitle} — ${suite.test_object}`}
            />
          ) : (
            <p className="text-[13px] text-text-muted">Report Allure non disponibile.</p>
          )}
        </div>

        {allureUrl && (
          <div className="flex justify-end pt-2">
            <a
              href={allureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-accent hover:underline"
            >
              ↗ Apri in nuova scheda
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}