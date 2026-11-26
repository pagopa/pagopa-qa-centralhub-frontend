"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePullTlBranch, usePushTlBranch, useTlBranchSync } from "@/hooks/useTestLifecycle";
import {
  apiErrorCode,
  apiErrorMessage,
  apiErrorReasons,
  BRANCH_SYNC_LABEL,
  needsDecision,
  safeHttpUrl,
} from "@/lib/test-lifecycle";
import type { TlRevision } from "@/types/test-lifecycle";
import { BranchDivergenceDialog } from "./BranchDivergenceDialog";

interface Writer {
  saveAll: () => Promise<boolean>;
  afterPendingWrites: <T>(fn: () => Promise<T>) => Promise<T>;
}

const NOT_SAVED = "Alcune modifiche non sono state salvate: correggile prima di proseguire.";

/**
 * Top of the Scenari tab: where the draft stands against its working branch, "Salva tutti"
 * (every dirty scenario to the hub, then one commit of the file to the branch) and the choice to
 * make when the repository changed. A hub-only draft just gets "Salva tutti" (saves to the hub).
 */
export function BranchSyncBar({
  featureId,
  revision,
  editable,
  writer,
  onChanged,
}: {
  featureId: string;
  revision: TlRevision;
  editable: boolean;
  writer: Writer;
  /** The draft content was replaced from the repository: reload the page. */
  onChanged: () => void;
}) {
  const hasBranch = !!revision.work_branch;
  const sync = useTlBranchSync(featureId, revision.id, hasBranch);
  const push = usePushTlBranch();
  const pull = usePullTlBranch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [forceOpen, setForceOpen] = useState(false);

  if (!hasBranch && !editable) return null;

  const state = sync.data?.state;
  const decision = editable && !!state && needsDecision(state);
  const dialogOpen = forceOpen || (decision && dismissedFor !== state);
  const link = safeHttpUrl(sync.data?.compare_url);

  const saveAllNow = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!(await writer.saveAll())) {
        setError(NOT_SAVED);
        return;
      }
      if (!hasBranch) return;
      await writer.afterPendingWrites(() => push.mutateAsync({ featureId, revisionId: revision.id }));
    } catch (err) {
      if (apiErrorCode(err) === "repo_changed") setForceOpen(true);
      else setError(apiErrorMessage(err) ?? "Salvataggio sul repo non riuscito.");
    } finally {
      setBusy(false);
    }
  };

  const failure = (err: unknown) =>
    apiErrorReasons(err).join(" ") || apiErrorMessage(err) || "Operazione non riuscita.";

  const accept = async () => {
    setDialogError(null);
    setBusy(true);
    try {
      await writer.afterPendingWrites(() => pull.mutateAsync({ featureId, revisionId: revision.id }));
      setForceOpen(false);
      onChanged();
    } catch (err) {
      setDialogError(failure(err));
    } finally {
      setBusy(false);
    }
  };

  const overwrite = async () => {
    setDialogError(null);
    setBusy(true);
    try {
      if (!(await writer.saveAll())) {
        setDialogError(NOT_SAVED);
        return;
      }
      await writer.afterPendingWrites(() =>
        push.mutateAsync({ featureId, revisionId: revision.id, overwrite: true }),
      );
      setForceOpen(false);
    } catch (err) {
      setDialogError(failure(err));
    } finally {
      setBusy(false);
    }
  };

  const closeDialog = () => {
    setForceOpen(false);
    setDialogError(null);
    if (state) setDismissedFor(state);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-subtle px-3 py-2 text-[13px]">
        {hasBranch && (
          <>
            <GitBranch size={14} aria-hidden className="text-text-muted" />
            <span className="font-mono text-text">{revision.work_branch}</span>
            {state && (
              <span
                className="rounded-full border px-2 py-0.5 text-[12px]"
                style={{
                  borderColor: decision ? "var(--danger)" : "var(--border)",
                  color: decision ? "var(--danger)" : "var(--text-dim)",
                }}
              >
                {BRANCH_SYNC_LABEL[state]}
              </span>
            )}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                Confronta su GitHub
              </a>
            )}
          </>
        )}
        {editable && (
          <span className="ml-auto flex items-center gap-2">
            {decision && !dialogOpen && (
              <button
                type="button"
                className={SECONDARY_BUTTON_CLASS}
                onClick={() => {
                  setDismissedFor(null);
                  setForceOpen(true);
                }}
              >
                Risolvi
              </button>
            )}
            <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={busy} onClick={() => void saveAllNow()}>
              Salva tutti
            </button>
          </span>
        )}
      </div>
      {!editable && (state === "repo_ahead" || state === "diverged") && (
        <p className="text-[12px] text-text-dim">
          Il branch ha modifiche non presenti nell&apos;hub: verranno importate al merge.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <BranchDivergenceDialog
        open={dialogOpen}
        state={state}
        compareUrl={sync.data?.compare_url}
        busy={busy}
        error={dialogError}
        onAccept={() => void accept()}
        onOverwrite={() => void overwrite()}
        onClose={closeDialog}
      />
    </div>
  );
}
