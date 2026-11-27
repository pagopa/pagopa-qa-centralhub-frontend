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
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useImportTlIssueFile, useTlScopes } from "@/hooks/useTestLifecycle";
import { apiErrorMessage, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlAdoptResult, TlIssue } from "@/types/test-lifecycle";

interface Props {
  /** The file question to import; `null` keeps the dialog closed. */
  issue: TlIssue | null;
  onClose: () => void;
}

/**
 * Brings a feature file that is on the repository but not in the hub into the hub. The folder
 * usually tells the scope; otherwise the user picks it. A file without the hub's header gets a
 * pull request that adds the header and the scenario tags.
 */
export function ImportFileDialog({ issue, onClose }: Props) {
  // Remounted for every file so the choices start fresh.
  return <ImportDialog key={issue?.id ?? "closed"} issue={issue} onClose={onClose} />;
}

function ImportDialog({ issue, onClose }: Props) {
  const { data: scopes } = useTlScopes();
  const run = useImportTlIssueFile();
  const suggested = typeof issue?.detail?.scope_code === "string" ? issue.detail.scope_code : "";
  const [scopeCode, setScopeCode] = useState(suggested);
  const [result, setResult] = useState<TlAdoptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!issue) return;
    setError(null);
    try {
      setResult(await run.mutateAsync({ issueId: issue.id, scopeCode: scopeCode || null }));
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Importazione non riuscita.");
    }
  };

  const prUrl = safeHttpUrl(result?.pr_url);

  return (
    <Dialog open={issue !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>File importato</DialogTitle>
              <DialogDescription>
                Ora è la feature <span className="font-mono">{result.code}</span>.
              </DialogDescription>
            </DialogHeader>
            {result.alignment_pending && prUrl && (
              <p className="text-[13px] text-text">
                Il file non ha ancora l&apos;intestazione e i tag dell&apos;hub: li aggiunge questa{" "}
                <a href={prUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
                  PR di allineamento
                </a>
                . Va mergiata sul repository.
              </p>
            )}
            {result.alignment_pending && !prUrl && (
              <p role="note" className="text-[13px]" style={{ color: "var(--warning-ink)" }}>
                La PR di allineamento non è stata aperta{result.pr_error ? `: ${result.pr_error}` : "."} Si può riprovare
                dalla migrazione dell&apos;ambito.
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
            <DialogHeader>
              <DialogTitle>Importa nell&apos;hub</DialogTitle>
              <DialogDescription>
                <span className="font-mono break-all">{issue?.path}</span>
              </DialogDescription>
            </DialogHeader>
            <label className="flex flex-col gap-1 text-xs text-text-dim">
              Ambito
              <select className={SELECT_CLASS} value={scopeCode} onChange={(e) => setScopeCode(e.target.value)}>
                <option value="">Seleziona un ambito…</option>
                {(scopes ?? []).map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[12px] text-text-dim">
              Il file diventa una feature pubblicata dell&apos;ambito, con gli scenari che contiene. Se non ha
              l&apos;intestazione <span className="font-mono"># qa-hub:</span>, l&apos;hub apre una PR che la aggiunge
              insieme ai tag degli scenari; il file su main non cambia finché non la mergi.
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
                disabled={!scopeCode || run.isPending}
                aria-busy={run.isPending || undefined}
                onClick={() => void submit()}
              >
                {run.isPending && <Spinner />}
                {run.isPending ? "Importazione…" : "Importa"}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
