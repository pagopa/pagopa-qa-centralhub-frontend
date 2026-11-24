"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { Gate } from "@/lib/permissions";
import { REVISION_STATUS_LABEL, TRANSITION_LABEL } from "@/lib/test-lifecycle";
import type { TlSaveState } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlTransitionAction, TransitionCheck } from "@/types/test-lifecycle";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { ReadinessChecklist } from "./ReadinessChecklist";
import { SaveIndicator } from "./SaveIndicator";

/** Transitions driven by authors vs reviewers (the backend still checks reviewer identity). */
const TRANSITION_PERMISSION: Record<TlTransitionAction, string> = {
  submit: "edit:tl_feature",
  reopen: "edit:tl_feature",
  approve: "review:tl_feature",
  request_changes: "review:tl_feature",
};

/** The action whose blocking reasons are worth showing inline for the current revision status. */
const PRIMARY_ACTION: Partial<Record<string, TlTransitionAction>> = {
  draft: "submit",
  in_review: "approve",
};

function TransitionButton({
  check,
  disabled,
  onClick,
}: {
  check: TransitionCheck;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = TRANSITION_LABEL[check.action];
  const blocked = !check.allowed;
  const reasonsId = `transition-reasons-${check.action}`;
  return (
    // The wrapper carries the tooltip: disabled buttons do not receive hover events.
    <span title={blocked ? check.reasons.join("\n") : undefined}>
      <button
        type="button"
        className={check.action === "approve" || check.action === "submit" ? PRIMARY_BUTTON_CLASS : SECONDARY_BUTTON_CLASS}
        disabled={disabled || blocked}
        aria-describedby={blocked && check.reasons.length ? reasonsId : undefined}
        onClick={onClick}
      >
        {label}
      </button>
      {blocked && check.reasons.length > 0 && (
        <span id={reasonsId} className="sr-only">
          {`${label} non disponibile: ${check.reasons.join("; ")}`}
        </span>
      )}
    </span>
  );
}

export function FeatureHeader({
  feature,
  onTransition,
  disabled = false,
  pending = false,
  error = null,
  onRebase,
  onDelete,
  deletable = true,
  saveState,
}: {
  feature: TlFeatureDetail;
  /** Opens the delete confirmation; the button is shown only when provided (and gated by permission). */
  onDelete?: () => void;
  /** Save status of the drafts, shown next to the actions. */
  saveState?: TlSaveState;
  /** False when the feature cannot be deleted (published on Git or open PR). */
  deletable?: boolean;
  /** Opens the three-way rebase dialog (shown when the working draft is stale). */
  onRebase?: () => void;
  /** Resolves to false when the transition failed (the note dialog then stays open). */
  onTransition: (action: TlTransitionAction, note?: string) => Promise<boolean | void> | void;
  /** True while the session loads: write actions stay disabled. */
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const revision = feature.working_revision ?? feature.published_revision;
  const primary = revision ? PRIMARY_ACTION[revision.status] : undefined;
  const primaryCheck = feature.transitions.find((t) => t.action === primary);
  const shownReasons = primaryCheck && !primaryCheck.allowed ? primaryCheck.reasons : [];

  const run = (action: TlTransitionAction) => {
    if (action === "request_changes") {
      setNote("");
      setNoteOpen(true);
      return;
    }
    void onTransition(action);
  };

  const confirmRequestChanges = async () => {
    const text = note.trim();
    if (!text) return;
    const ok = await onTransition("request_changes", text);
    if (ok !== false) setNoteOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[13px] font-medium text-text-muted">{feature.code}</span>
            <FeatureStatusBadge status={feature.status} />
            {revision && (
              <span
                className="font-mono rounded-full text-[11px] px-2 py-0.5"
                style={{ background: "var(--neutral-soft)", color: "var(--text-dim)" }}
              >
                Rev. {revision.number} · {REVISION_STATUS_LABEL[revision.status]}
              </span>
            )}
            {feature.working_revision?.base_stale && (
              <span
                className="rounded-full text-[11px] px-2 py-0.5"
                style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
              >
                Base superata
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold text-text break-words">{revision?.title ?? feature.code}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveState && <SaveIndicator state={saveState} />}
          {feature.working_revision?.base_stale && onRebase && (
            <Gate action="edit:tl_feature">
              <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={disabled || pending} onClick={onRebase}>
                Riallinea
              </button>
            </Gate>
          )}
          {feature.transitions.map((check) => (
            <Gate key={check.action} action={TRANSITION_PERMISSION[check.action]}>
              <TransitionButton check={check} disabled={disabled || pending} onClick={() => run(check.action)} />
            </Gate>
          ))}
          {onDelete && (
            <Gate action="edit:tl_feature">
              <span title={deletable ? undefined : "Feature pubblicata su Git o con PR aperta: non eliminabile"}>
                <button
                  type="button"
                  className={`${SECONDARY_BUTTON_CLASS} hover:!text-danger disabled:hover:!text-text`}
                  disabled={disabled || pending || !deletable}
                  onClick={onDelete}
                >
                  <Trash2 size={16} aria-hidden /> Elimina
                </button>
              </span>
            </Gate>
          )}
        </div>
      </div>

      {primaryCheck && (primaryCheck.action === "submit" || primaryCheck.action === "approve") && (
        <Gate action={TRANSITION_PERMISSION[primaryCheck.action]}>
          <ReadinessChecklist action={primaryCheck.action} reasons={shownReasons} />
        </Gate>
      )}

      {error && (
        <p role="alert" className="text-danger text-[13px]">
          {error}
        </p>
      )}

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Richiedi modifiche</DialogTitle>
          </DialogHeader>
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Nota per l&apos;autore
            <textarea
              className="min-h-24 rounded-[var(--radius-sm)] border border-border-strong bg-surface p-2 text-[14px] text-text outline-none focus:border-accent"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-danger text-[13px]">
              {error}
            </p>
          )}
          <DialogFooter>
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setNoteOpen(false)}>
              Annulla
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              disabled={!note.trim() || pending || disabled}
              onClick={() => void confirmRequestChanges()}
            >
              Invia richiesta
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
