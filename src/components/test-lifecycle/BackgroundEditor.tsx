"use client";

import { useDraftSave } from "@/hooks/useDraftSave";
import { useLiveValidation } from "@/hooks/useLiveValidation";
import type { RegisterFlush } from "@/lib/test-lifecycle";
import type { TlRevision, TlRevisionUpdate } from "@/types/test-lifecycle";
import { StepsEditor } from "./StepsEditor";

type BackgroundPatch = Pick<TlRevisionUpdate, "background_steps">;

const diff = (saved: string, next: string): BackgroundPatch =>
  saved === next ? {} : { background_steps: next.trim() ? next : null };

/** "Contesto" (Background) of the revision: steps editor with live validation, saved on blur. */
export function BackgroundEditor({
  revision,
  readOnly,
  stale = false,
  onSave,
  registerFlush,
}: {
  revision: TlRevision;
  readOnly: boolean;
  stale?: boolean;
  onSave: (patch: BackgroundPatch) => Promise<unknown>;
  registerFlush?: RegisterFlush;
}) {
  const { errors, setErrors, validationError, schedule } = useLiveValidation(
    revision.background_errors,
  );
  const { draft, setDraft, save, saving, error } = useDraftSave<string, BackgroundPatch>({
    initial: revision.background_steps ?? "",
    diff,
    persist: onSave,
    onSaved: (result) => {
      const rev = result as TlRevision | undefined;
      if (rev?.background_errors) setErrors(rev.background_errors);
    },
    disabled: readOnly || stale,
    registerFlush,
  });

  if (readOnly && !draft) return null;

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Contesto</h2>
        <span className="text-[12px] text-text-muted" aria-live="polite">
          {saving ? "Salvataggio…" : ""}
        </span>
      </div>
      <StepsEditor
        autocomplete
        label="Step del contesto"
        value={draft}
        readOnly={readOnly}
        errors={errors}
        notice={validationError}
        onChange={(steps) => {
          setDraft(steps);
          schedule({ steps, background: true });
        }}
        onBlur={() => void save()}
      />
      {error && (
        <p role="alert" className="text-danger text-[13px]">
          {error}
        </p>
      )}
    </section>
  );
}
