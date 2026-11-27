import { Check } from "lucide-react";
import type { TlFeatureDetail, TlFeatureStatus, TlRevisionStatus } from "@/types/test-lifecycle";
import { areaStyle } from "@/components/shell/NavItemLink";

type ProgressInput = Pick<TlFeatureDetail, "status" | "working_revision" | "published_revision">;

export interface ProgressStep {
  label: string;
  state: "done" | "current" | "upcoming";
}

const REVISION_STEP: Record<TlRevisionStatus, number> = {
  draft: 0,
  in_review: 1,
  approved: 2,
  merged: 3,
  superseded: 3,
};

const FEATURE_STEP: Record<TlFeatureStatus, number> = {
  draft: 0,
  in_review: 1,
  designed: 2,
  implemented: 3,
  running: 3,
};

/**
 * The four lifecycle steps with the current one taken from the revision being worked on
 * (the working revision, else the published one); without a revision the feature status decides.
 * "In esecuzione NRT" is a badge, not a step: the last step is always Implementata.
 */
export function progressSteps(feature: ProgressInput): ProgressStep[] {
  const revision = feature.working_revision ?? feature.published_revision;
  const current = revision ? REVISION_STEP[revision.status] : FEATURE_STEP[feature.status];
  const labels = ["Bozza", "In review", "Progettata", "Implementata"];
  return labels.map((label, i) => ({
    label,
    state: i < current ? "done" : i === current ? "current" : "upcoming",
  }));
}

/** Where the feature is in its lifecycle, at a glance. */
export function LifecycleProgress({ feature }: { feature: ProgressInput }) {
  const steps = progressSteps(feature);
  return (
    <ol
      role="list"
      aria-label="Avanzamento della feature"
      className="flex flex-wrap items-center gap-y-2 py-1"
      style={areaStyle("violet")}
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="flex shrink-0 items-center"
        >
          {i > 0 && (
            <span
              aria-hidden="true"
              className="mx-2 h-px w-6 sm:w-10"
              style={{ background: step.state === "upcoming" ? "var(--border-strong)" : "var(--area)" }}
            />
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${
              step.state === "current" ? "font-medium text-text" : "text-text-dim"
            } ${step.state === "upcoming" ? "border-dashed" : ""}`}
            style={{
              borderColor: step.state === "upcoming" ? "var(--border)" : "var(--area)",
              background: step.state === "current" ? "var(--area-soft)" : undefined,
            }}
          >
            {step.state === "done" && <Check size={14} aria-hidden="true" className="text-[color:var(--success)]" />}
            {step.state === "current" && (
              <span aria-hidden="true" className="size-[7px] rounded-full bg-[color:var(--area)]" />
            )}
            {step.label}
            {step.state === "done" && <span className="sr-only">completato</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
