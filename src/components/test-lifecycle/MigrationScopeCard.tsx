"use client";

import { useState } from "react";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import {
  useExecuteTlMigrationScope,
  useRetryTlMigrationConfluence,
  useRetryTlMigrationPr,
} from "@/hooks/useTestLifecycle";
import { apiErrorMessage, apiErrorReasons, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlMigrationScope } from "@/types/test-lifecycle";

const PR_STATE: Record<string, string> = { open: "aperta", merged: "integrata", closed: "chiusa" };

/** Riepilogo di un ambito della migrazione con esecuzione, PR di allineamento e Confluence. */
export function MigrationScopeCard({
  scope,
  cleanPending,
  onConfirmClean,
}: {
  scope: TlMigrationScope;
  cleanPending: number;
  onConfirmClean: () => void;
}) {
  const execute = useExecuteTlMigrationScope();
  const retryPr = useRetryTlMigrationPr();
  const retryConf = useRetryTlMigrationConfluence();
  const [error, setError] = useState<string | null>(null);
  const code = scope.scope_code || "Senza ambito";
  const prUrl = safeHttpUrl(scope.pr_url);
  const busy = execute.isPending || retryPr.isPending || retryConf.isPending;

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      const reasons = apiErrorReasons(err);
      setError(reasons.length ? reasons.join(" · ") : apiErrorMessage(err) ?? fallback);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 text-[13px]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-mono font-semibold text-text">{code}</h3>
        <span className="text-[12px] text-text-muted">{scope.items} righe</span>
      </div>
      <p className="text-text-dim">
        {scope.pending} da decidere · {scope.confirmed} confermate · {scope.excluded} escluse ·{" "}
        {scope.executed} eseguite
        {scope.with_problems > 0 && <> · <span style={{ color: "var(--warning)" }}>{scope.with_problems} con problemi</span></>}
      </p>
      {scope.pr_number && (
        <p className="text-text-dim">
          {prUrl ? (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
              PR #{scope.pr_number}
            </a>
          ) : (
            <span>PR #{scope.pr_number}</span>
          )}
          {scope.pr_state && <> · {PR_STATE[scope.pr_state] ?? scope.pr_state}</>}
        </p>
      )}
      {scope.pr_error && <p className="text-danger">PR: {scope.pr_error}</p>}
      {scope.confluence_errors.map((e, i) => (
        <p key={`${e.page_id}-${i}`} className="text-text-muted">
          Confluence{e.page_id ? ` (pagina ${e.page_id})` : ""}: {e.message}
        </p>
      ))}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {cleanPending > 0 && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={onConfirmClean} disabled={busy}>
            Conferma {cleanPending} righe senza problemi
          </button>
        )}
        <button
          type="button"
          className={PRIMARY_BUTTON_CLASS}
          disabled={busy || scope.confirmed === 0 || !scope.scope_code}
          onClick={() => void run(() => execute.mutateAsync({ scopeCode: scope.scope_code }), "Esecuzione non riuscita.")}
        >
          Esegui {code}
        </button>
        {scope.pr_error && (
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={busy}
            onClick={() => void run(() => retryPr.mutateAsync({ scopeCode: scope.scope_code }), "PR non riuscita.")}
          >
            Riprova PR
          </button>
        )}
        {scope.confluence_errors.length > 0 && (
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={busy}
            onClick={() => void run(() => retryConf.mutateAsync({ scopeCode: scope.scope_code }), "Confluence non aggiornato.")}
          >
            Riprova Confluence
          </button>
        )}
      </div>
    </section>
  );
}
