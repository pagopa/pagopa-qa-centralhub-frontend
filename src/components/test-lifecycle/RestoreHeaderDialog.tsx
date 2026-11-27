"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/Spinner";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useRestoreTlIssueHeader } from "@/hooks/useTestLifecycle";
import { apiErrorMessage, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlIssue, TlRestoreHeaderResult } from "@/types/test-lifecycle";

interface Props {
  /** The lost-header question to answer; `null` keeps the dialog closed. */
  issue: TlIssue | null;
  onClose: () => void;
}

/**
 * Gives a managed feature file its `# qa-hub:` header back through a pull request. The header is
 * the feature's own code (it is its identity, so it cannot be chosen); the PR adds only that line.
 */
export function RestoreHeaderDialog({ issue, onClose }: Props) {
  // Remounted for every file so the outcome of a previous one does not stay.
  return <RestoreDialog key={issue?.id ?? "closed"} issue={issue} onClose={onClose} />;
}

function RestoreDialog({ issue, onClose }: Props) {
  const run = useRestoreTlIssueHeader();
  const [result, setResult] = useState<TlRestoreHeaderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const code = typeof issue?.detail?.code === "string" ? issue.detail.code : (issue?.feature_code ?? "");

  const submit = async () => {
    if (!issue) return;
    setError(null);
    try {
      setResult(await run.mutateAsync({ issueId: issue.id }));
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Operazione non riuscita.");
    }
  };

  const prUrl = safeHttpUrl(result?.pr_url);

  return (
    <Dialog open={issue !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ripristina intestazione</DialogTitle>
          <DialogDescription>
            <span className="font-mono break-all">{issue?.path}</span>
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <>
            {prUrl && (
              <p className="text-[13px] text-text">
                Aperta la{" "}
                <a href={prUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
                  PR con l&apos;intestazione
                </a>
                . Quando la mergi, l&apos;anomalia si chiude da sola al prossimo sync.
              </p>
            )}
            {!prUrl && !result.pr_error && (
              <p className="text-[13px] text-text">L&apos;intestazione è già tornata nel file: non serve nessuna PR.</p>
            )}
            {result.pr_error && (
              <p role="note" className="text-[13px]" style={{ color: "var(--warning-ink)" }}>
                La PR non è stata aperta: {result.pr_error}
              </p>
            )}
            <DialogFooter>
              <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onClose}>
                Chiudi
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-[13px] text-text">
              L&apos;hub aggiunge in cima al file la riga <span className="font-mono"># qa-hub: {code}</span>. Il codice
              è l&apos;identità della feature, quindi non si sceglie. La PR non cambia nient&apos;altro del file, nemmeno
              le modifiche fatte mentre l&apos;intestazione mancava: dopo il merge l&apos;hub le legge dal file.
            </p>
            {error && (
              <p role="alert" className="text-danger text-[13px]">
                {error}
              </p>
            )}
            <DialogFooter>
              <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onClose}>
                Annulla
              </button>
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                disabled={run.isPending}
                aria-busy={run.isPending || undefined}
                onClick={() => void submit()}
              >
                {run.isPending && <Spinner />}
                {run.isPending ? "Apertura…" : "Apri la PR"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
