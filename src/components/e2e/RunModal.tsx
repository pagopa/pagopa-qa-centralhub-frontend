"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip } from "@/components/primitives/Chip";
import type { E2eRunWithSuite, E2eRunStatus } from "@/types/index";

interface RunModalProps {
  run: E2eRunWithSuite | null;
  open: boolean;
  onClose: () => void;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function RunModal({ run, open, onClose }: RunModalProps) {
  if (!run) return null;

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
            <span>{run.suite_display_name}</span>
            <span className="text-text-muted font-normal text-[13px]">
              {new Date(run.run_at).toLocaleString("it-IT")}
            </span>
            <Chip variant="status" value={run.status as E2eRunStatus} />
          </DialogTitle>
        </DialogHeader>

        {/* Stats row */}
        <div className="flex gap-4 text-[13px] pb-3 border-b border-border">
          <span className="text-success font-mono">✓ {run.passed} passed</span>
          <span className="text-danger font-mono">✗ {run.failed} failed</span>
          <span className="text-text-muted font-mono">⏭ {run.skipped} skip</span>
          <span className="text-text-dim font-mono ml-auto">⏱ {fmtDuration(run.duration_ms)}</span>
        </div>

        {/* Allure iframe */}
        <div className="flex-1 min-h-0 relative">
          <iframe
            src={run.allure_url}
            className="w-full h-full rounded-[var(--radius-sm)] border border-border"
            title={`Allure report — ${run.suite_display_name}`}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <a
            href={run.allure_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-accent hover:underline"
          >
            ↗ Apri in nuova tab
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
