"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import { useCreateTlJiraTask, useRefreshTlJira } from "@/hooks/useTestLifecycle";
import { apiErrorMessage, JIRA_CATEGORY_COLOR, JIRA_CATEGORY_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlJiraLink, TlJiraRole, TlJiraTaskKind } from "@/types/test-lifecycle";

const ROLES: { role: TlJiraRole; label: string; empty: string }[] = [
  { role: "design", label: "Progettazione", empty: "Nessun task" },
  { role: "impl", label: "Implementazione", empty: "Nessun task" },
  { role: "qa_epic", label: "Epic QA", empty: "Nessuna Epic" },
  { role: "product", label: "Prodotto", empty: "Nessuna Epic/Story" },
];

function StatusBadge({ link }: { link: TlJiraLink }) {
  const style = link.verified && link.category ? JIRA_CATEGORY_COLOR[link.category] : JIRA_CATEGORY_COLOR.unverified;
  const label = link.verified && link.category ? JIRA_CATEGORY_LABEL[link.category] : "Non verificata";
  return (
    <span
      className="inline-flex items-center font-mono rounded-full whitespace-nowrap"
      style={{ fontSize: 11, padding: "2px 8px", color: style.color, background: style.bg }}
      title={link.verified ? (link.status ?? undefined) : "Stato non letto da Jira"}
    >
      {label}
    </span>
  );
}

/**
 * Task Jira collegati alla feature: progettazione, implementazione, Epic QA effettiva ed
 * Epic/Story di prodotto, con lo stato letto da Jira e le azioni di creazione/aggiornamento.
 */
export function JiraLinks({ feature, disabled = false }: { feature: TlFeatureDetail; disabled?: boolean }) {
  const { can } = usePermissions();
  const create = useCreateTlJiraTask();
  const refresh = useRefreshTlJira();
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = can("edit:tl_feature");
  const working = feature.working_revision;
  const published = feature.published_revision;
  const canCreateDesign = canEdit && working?.status === "draft" && !feature.jira_design_key;
  const canRetryImpl =
    canEdit && published?.status === "approved" && !feature.jira_impl_key && !!feature.jira_error;
  const byRole = new Map(feature.jira.map((l) => [l.role, l]));

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
  const createTask = (kind: TlJiraTaskKind) =>
    run(() => create.mutateAsync({ featureId: feature.id, kind }), "Creazione del task Jira non riuscita.");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-sm)] border border-border">
        {ROLES.map(({ role, label, empty }) => {
          const link = byRole.get(role);
          const href = safeHttpUrl(link?.url);
          return (
            <li key={role} data-testid={`jira-${role}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
              <span className="w-32 shrink-0 text-text-muted">{label}</span>
              {link ? (
                <>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
                      {link.key}
                    </a>
                  ) : (
                    <span className="font-mono text-text">{link.key}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-text">{link.summary ?? ""}</span>
                  <StatusBadge link={link} />
                </>
              ) : (
                <span className="text-text-muted">{empty}</span>
              )}
            </li>
          );
        })}
      </ul>

      {feature.jira_error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{feature.jira_error}</p>
      )}
      {error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
      )}
      {warning && (
        <p role="status" className="text-[13px]" style={{ color: "var(--warning)" }}>{warning}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {canCreateDesign && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled || create.isPending} onClick={() => void createTask("design")}>
            Crea task Progettazione
          </button>
        )}
        {canRetryImpl && (
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled || create.isPending} onClick={() => void createTask("impl")}>
            Riprova task Implementazione
          </button>
        )}
        {feature.jira.length > 0 && (
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
