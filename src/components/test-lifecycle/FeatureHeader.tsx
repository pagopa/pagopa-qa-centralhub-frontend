"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { Gate } from "@/lib/permissions";
import { REVISION_STATUS_LABEL, TRANSITION_LABEL } from "@/lib/test-lifecycle";
import type { TlSaveState } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlRevisionStatus, TlTransitionAction, TransitionCheck } from "@/types/test-lifecycle";
import { Spinner } from "@/components/ui/Spinner";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { ReadinessChecklist } from "./ReadinessChecklist";
import { ReopenDialog } from "./ReopenDialog";
import { SaveIndicator } from "./SaveIndicator";

/** Transitions driven by authors vs reviewers (the backend still checks reviewer identity). */
const TRANSITION_PERMISSION: Record<TlTransitionAction, string> = {
  submit: "edit:tl_feature",
  reopen: "edit:tl_feature",
  approve: "review:tl_feature",
  request_changes: "review:tl_feature",
  withdraw_approval: "review:tl_feature",
  withdraw: "edit:tl_feature",
};

/** Going back only makes sense in one revision status: outside it the button is not listed at all. */
const ONLY_WHILE: Partial<Record<TlTransitionAction, TlRevisionStatus>> = {
  withdraw_approval: "approved",
  withdraw: "in_review",
};

/** The action whose blocking reasons are worth showing inline for the current revision status. */
const PRIMARY_ACTION: Partial<Record<string, TlTransitionAction>> = {
  draft: "submit",
  in_review: "approve",
};

function TransitionButton({
  check,
  disabled,
  busy = false,
  onClick,
}: {
  check: TransitionCheck;
  disabled: boolean;
  /** This is the transition being applied: a spinner shows next to the label. */
  busy?: boolean;
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
        aria-busy={busy || undefined}
        onClick={onClick}
      >
        {busy && <Spinner />}
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
  onMove,
  deletable = true,
  saveState,
}: {
  feature: TlFeatureDetail;
  /** Opens the delete confirmation; the button is shown only when provided (and gated by permission). */
  onDelete?: () => void;
  /** Opens the move dialog; the button is shown only when provided (and gated by permission). */
  onMove?: () => void;
  /** Save status of the drafts, shown next to the actions. */
  saveState?: TlSaveState;
  /** False when the feature cannot be deleted (published on Git or open PR). */
  deletable?: boolean;
  /** Opens the three-way rebase dialog (shown when the working draft is stale). */
  onRebase?: () => void;
  /** Resolves to false when the transition failed (the note dialog then stays open). */
  onTransition: (
    action: TlTransitionAction,
    note?: string,
    branchName?: string,
  ) => Promise<boolean | void> | void;
  /** True while the session loads: write actions stay disabled. */
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  // The page-level error may predate the dialog: show it there only after a confirmation attempt.
  const [withdrawAttempted, setWithdrawAttempted] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenAttempted, setReopenAttempted] = useState(false);
  const [note, setNote] = useState("");
  // the transition the person asked for last: it is the one that shows the spinner while pending
  const [lastAction, setLastAction] = useState<TlTransitionAction | null>(null);
  const revision = feature.working_revision ?? feature.published_revision;
  const primary = revision ? PRIMARY_ACTION[revision.status] : undefined;
  const primaryCheck = feature.transitions.find((t) => t.action === primary);
  const shownReasons = primaryCheck && !primaryCheck.allowed ? primaryCheck.reasons : [];

  const run = (action: TlTransitionAction) => {
    setLastAction(action);
    if (action === "request_changes") {
      setNote("");
      setNoteOpen(true);
      return;
    }
    if (action === "withdraw_approval") {
      setWithdrawAttempted(false);
      setWithdrawOpen(true);
      return;
    }
    if (action === "reopen") {
      setReopenAttempted(false);
      setReopenOpen(true);
      return;
    }
    void onTransition(action);
  };

  const confirmWithdrawApproval = async () => {
    setWithdrawAttempted(true);
    const ok = await onTransition("withdraw_approval");
    if (ok !== false) setWithdrawOpen(false);
  };

  const confirmReopen = async (branchName: string | undefined) => {
    setReopenAttempted(true);
    const ok = await onTransition("reopen", undefined, branchName);
    if (ok !== false) setReopenOpen(false);
  };

  // The next revision number, to propose the name of the branch the backend would generate.
  const nextRevision = (feature.published_revision?.number ?? 0) + 1;

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
            <FeatureStatusBadge status={feature.display_status} running={feature.is_running} />
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
          {feature.transitions
            .filter((check) => {
              const only = ONLY_WHILE[check.action];
              return !only || revision?.status === only;
            })
            .map((check) => (
            <Gate key={check.action} action={TRANSITION_PERMISSION[check.action]}>
              <TransitionButton
                check={check}
                disabled={disabled || pending}
                busy={pending && lastAction === check.action}
                onClick={() => run(check.action)}
              />
            </Gate>
          ))}
          {onMove && (
            <Gate action="edit:tl_feature">
              <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled} onClick={onMove}>
                Sposta
              </button>
            </Gate>
          )}
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

      {feature.working_revision?.pr_state === "open" &&
        (feature.working_revision.status === "draft" || feature.working_revision.status === "in_review") && (
          // Only a withdrawn approval leaves a revision in draft/in review with its PR still open.
          <p
            role="note"
            className="rounded-[var(--radius-sm)] px-3 py-2 text-[13px]"
            style={{ background: "var(--warning-soft)", color: "var(--warning-ink)" }}
          >
            La PR #{feature.working_revision.pr_number} è ancora aperta con la versione approvata in precedenza: non
            mergiarla finché la revisione non è di nuovo approvata.
          </p>
        )}

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

      <ReopenDialog
        open={reopenOpen}
        defaultBranch={`qa-hub/${feature.code}-r${nextRevision}`}
        busy={pending || disabled}
        error={reopenAttempted ? error : null}
        onConfirm={(name) => void confirmReopen(name)}
        onClose={() => setReopenOpen(false)}
      />

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Riportare in review?</DialogTitle>
            <DialogDescription>
              L&apos;approvazione viene ritirata e la revisione torna in review.{" "}
              {revision?.pr_number ? `La PR #${revision.pr_number}` : "L'eventuale PR"} su GitHub resta aperta con la
              versione approvata in precedenza: non mergiarla finché la revisione non è di nuovo approvata.
            </DialogDescription>
          </DialogHeader>
          {withdrawAttempted && error && (
            <p role="alert" className="text-danger text-[13px]">
              {error}
            </p>
          )}
          <DialogFooter>
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => setWithdrawOpen(false)}>
              Annulla
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              disabled={pending || disabled}
              onClick={() => void confirmWithdrawApproval()}
            >
              Conferma
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
