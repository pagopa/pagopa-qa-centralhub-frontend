import { Chip } from "@/components/primitives/Chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApplicationRow, RunOutcome, TechStack } from "@/types/release-status";

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
export function RuntimeChips({ app }: { app: Pick<ApplicationRow, "runtime" | "ci" | "version_source"> }) {
  return (
    <>
      <Chip variant="status" value={app.runtime === "AKS" ? "running" : "skipped"} label={app.runtime} />
      <Chip variant="status" value={app.ci === "GHA" ? "running" : "skipped"} label={app.ci} />
      {app.version_source === "MANUAL" && <Chip variant="status" value="inprogress" label="manuale" />}
    </>
  );
}

function stackTooltip(stack: TechStack): string | null {
  if (!stack.source && !stack.ref) return null;
  const origin = stack.source === "dockerfile" ? "Dockerfile" : stack.source === "build_file" ? "file di build" : null;
  const release = stack.ref ? `alla release ${stack.ref}` : null;
  return ["Rilevato", origin && `da ${origin}`, release].filter(Boolean).join(" ");
}

/** Neutral chip with the detected technology (e.g. "JAVA 21"); nothing when it is unknown. */
export function StackChip({ stack }: { stack: TechStack | null }) {
  if (!stack) return null;
  const label = stack.version ? `${stack.language} ${stack.version}` : stack.language;
  const chip = <Chip variant="status" value="skipped" label={label} />;
  const tooltip = stackTooltip(stack);
  if (!tooltip) return chip;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent" />}
      >
        {chip}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
