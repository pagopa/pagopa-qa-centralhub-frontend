import { Chip } from "@/components/primitives/Chip";
import type { ApplicationRow, RunOutcome } from "@/types/release-status";

export const OUTCOME_LABEL: Record<RunOutcome, string> = {
  PASSED: "superata",
  FAILED: "fallita",
  NEUTRAL: "senza esito",
};

export const OUTCOME_COLOR: Record<RunOutcome, string> = {
  PASSED: "text-success",
  FAILED: "text-danger",
  NEUTRAL: "text-text-dim",
};

/** Inline accent link used by the detail sheet and the run list. */
export const ACCENT_LINK_CLASS =
  "inline-flex items-center gap-1 rounded-sm text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent";

export function repoUrl(repository: string): string {
  return `https://github.com/pagopa/${repository}`;
}

/** Runtime and CI chips of an application. */
export function RuntimeChips({ app }: { app: Pick<ApplicationRow, "runtime" | "ci"> }) {
  return (
    <>
      <Chip variant="status" value={app.runtime === "AKS" ? "running" : "skipped"} label={app.runtime} />
      <Chip variant="status" value={app.ci === "GHA" ? "running" : "skipped"} label={app.ci} />
    </>
  );
}
