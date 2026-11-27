"use client";

import { useState } from "react";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import { useCreateTlJiraTask, useRefreshTlJira } from "@/hooks/useTestLifecycle";
import { apiErrorMessage, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlJiraTaskKind } from "@/types/test-lifecycle";
import { JiraHistory } from "./JiraHistory";

/**
 * Jira of the feature: the history of design/implementation tasks and epics per revision, the
 * product Epic/Story of the current revision, and the create/refresh actions.
 */
export function JiraLinks({ feature, disabled = false }: { feature: TlFeatureDetail; disabled?: boolean }) {
  const { can } = usePermissions();
  const create = useCreateTlJiraTask();
  const refresh = useRefreshTlJira();
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [epicInput, setEpicInput] = useState("");

  const canEdit = can("edit:tl_feature");
  const working = feature.working_revision;
  const published = feature.published_revision;
  const canCreateDesign = canEdit && working?.status === "draft" && !feature.jira_design_key;
  const canRetryImpl =
    canEdit && published?.status === "approved" && !feature.jira_impl_key && !!feature.jira_error;
  const product = feature.jira.find((l) => l.role === "product") ?? null;
  const productHref = safeHttpUrl(product?.url);

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError(null);
    setWarning(null);
    try {
      const data = (await fn()) as { jira_warning?: string | null } | undefined;
      setWarning(data?.jira_warning ?? null);
    } catch (err) {
      setError(apiErrorMessage(err) ?? fallback);
    }
  };
  // every design/implementation task hangs under an Epic QA: without one it must be entered
  const needsEpic = !feature.jira_qa_epic_effective;
  const epicKey = epicInput.trim().toUpperCase();
  const missingEpic = needsEpic && !epicKey;
  const createTask = (kind: TlJiraTaskKind) =>
    run(
      () => create.mutateAsync({ featureId: feature.id, kind, ...(needsEpic ? { epicKey } : {}) }),
      "Creazione del task Jira non riuscita.",
    );

  return (
    <div className="flex flex-col gap-4">
      <JiraHistory rows={feature.jira_history} />
      {product && (
        <p className="text-[13px] text-text-muted">
          Epic/Story prodotto:{" "}
          {productHref ? (
            <a href={productHref} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
              {product.key}
            </a>
          ) : (
            <span className="font-mono text-text">{product.key}</span>
          )}
          {product.summary ? <span className="text-text"> — {product.summary}</span> : null}
        </p>
      )}

      {feature.jira_error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{feature.jira_error}</p>
      )}
      {error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
      )}
      {warning && (
        <p role="status" className="text-[13px]" style={{ color: "var(--warning)" }}>{warning}</p>
      )}

      {needsEpic && (canCreateDesign || canRetryImpl) && (
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1 text-xs text-text-dim">
            Epic QA (obbligatoria)
            <input
              className={INPUT_CLASS}
              value={epicInput}
              placeholder="PQ-123"
              onChange={(e) => setEpicInput(e.target.value)}
            />
          </label>
          <p className="text-[12px] text-text-dim">
            Ogni task Jira è collegato a un&apos;Epic QA: né la feature né il suo ambito ne hanno una. L&apos;Epic indicata
            viene salvata sulla feature.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canCreateDesign && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled || create.isPending || missingEpic} onClick={() => void createTask("design")}>
            Crea task Progettazione
          </button>
        )}
        {canRetryImpl && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled || create.isPending || missingEpic} onClick={() => void createTask("impl")}>
            Riprova task Implementazione
          </button>
        )}
        {(feature.jira.length > 0 || feature.jira_history.length > 0) && (
          <button
            type="button"
            className={SECONDARY_BUTTON_CLASS}
            disabled={disabled || refresh.isPending}
            onClick={() => void run(() => refresh.mutateAsync({ featureId: feature.id }), "Aggiornamento da Jira non riuscito.")}
          >
            Aggiorna da Jira
          </button>
        )}
      </div>
    </div>
  );
}
