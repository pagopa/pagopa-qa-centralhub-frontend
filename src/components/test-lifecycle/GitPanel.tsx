"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import {
  usePublishTlRevision,
  useRetryTlImportCleanup,
  useTlIssues,
  useUpdateTlIssue,
} from "@/hooks/useTestLifecycle";
import { apiErrorMessage, PR_STATE_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlFeatureDetail } from "@/types/test-lifecycle";
import { IssueList } from "./IssueList";

function short(sha: string | null | undefined): string | null {
  return sha ? sha.slice(0, 7) : null;
}

export function GitPanel({ feature, disabled = false }: { feature: TlFeatureDetail; disabled?: boolean }) {
  const { can } = usePermissions();
  const publish = usePublishTlRevision();
  const issues = useTlIssues({ feature_id: feature.id });
  const updateIssue = useUpdateTlIssue();
  const retryCleanup = useRetryTlImportCleanup();
  const source = feature.import_source;
  const sourceUrl = safeHttpUrl(source?.url);
  const cleanupUrl = safeHttpUrl(source?.cleanup.pr_url);
  const [error, setError] = useState<string | null>(null);

  const revision = feature.working_revision ?? feature.published_revision;
  const prUrl = safeHttpUrl(revision?.pr_url);
  const canRetry =
    !!revision &&
    revision.status === "approved" &&
    revision.pr_state !== "open" &&
    (can("edit:tl_feature") || can("manage:tl_git"));
  const canManageIssues = can("manage:tl_git");
  const visibleIssues = (issues.data ?? []).filter((i) => i.status !== "resolved");

  const retry = async () => {
    if (!revision) return;
    setError(null);
    try {
      await publish.mutateAsync({ featureId: feature.id, revisionId: revision.id });
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Creazione della PR non riuscita.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[13px]">
        <dt className="text-text-muted">File</dt>
        <dd className="font-mono break-all text-text">{feature.git_path ?? "Non ancora creato"}</dd>
        <dt className="text-text-muted">Pull request</dt>
        <dd className="text-text">
          {revision?.pr_number ? (
            <>
              {prUrl ? (
                <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                  #{revision.pr_number}
                </a>
              ) : (
                <span>#{revision.pr_number}</span>
              )}
              {revision.pr_state && <span className="text-text-muted"> · {PR_STATE_LABEL[revision.pr_state]}</span>}
            </>
          ) : (
            <span className="text-text-muted">Nessuna</span>
          )}
        </dd>
        {short(revision?.merged_commit_sha) && (
          <>
            <dt className="text-text-muted">Commit di merge</dt>
            <dd className="font-mono text-text">{short(revision?.merged_commit_sha)}</dd>
          </>
        )}
      </dl>

      {source && (
        <div className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-[13px]">
          <span className="text-text">
            Importata da{" "}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
                {source.branch}
              </a>
            ) : (
              <span className="font-mono">{source.branch}</span>
            )}{" "}
            · <span className="font-mono break-all">{source.path}</span>
          </span>
          <span className="text-text-muted">
            {source.cleanup.state === "pending" && "PR di pulizia: verrà aperta all'approvazione."}
            {source.cleanup.state === "not_needed" && `PR di pulizia non necessaria${source.cleanup.note ? `: ${source.cleanup.note}` : "."}`}
            {source.cleanup.state === "open" && (
              <>
                PR di pulizia sul branch di partenza:{" "}
                {cleanupUrl ? (
                  <a href={cleanupUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    #{source.cleanup.pr_number}
                  </a>
                ) : (
                  <span>#{source.cleanup.pr_number}</span>
                )}
              </>
            )}
          </span>
          {source.cleanup.state === "error" && (
            <>
              <p role="alert" style={{ color: "var(--danger)" }}>PR di pulizia non creata: {source.cleanup.error}</p>
              {(can("edit:tl_feature") || can("manage:tl_git")) && (
                <button
                  type="button"
                  className={`${SECONDARY_BUTTON_CLASS} w-fit`}
                  disabled={disabled || retryCleanup.isPending}
                  onClick={() => void retryCleanup.mutateAsync({ featureId: feature.id }).catch(() => undefined)}
                >
                  Riprova PR di pulizia
                </button>
              )}
            </>
          )}
        </div>
      )}

      {revision?.pr_error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{revision.pr_error}</p>
      )}
      {error && (
        <p role="alert" className="text-[13px]" style={{ color: "var(--danger)" }}>{error}</p>
      )}
      {canRetry && (
        <div>
          <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={disabled || publish.isPending} onClick={() => void retry()}>
            Riprova PR
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-text">Anomalie</h3>
        {issues.isError ? (
          <p role="alert" className="text-[13px] text-text-muted">Impossibile caricare le anomalie.</p>
        ) : (
          <IssueList
            issues={visibleIssues}
            canManage={canManageIssues && !disabled}
            pending={updateIssue.isPending}
            onUpdate={(issue, status) =>
              void updateIssue.mutateAsync({ issueId: issue.id, status, featureId: feature.id })
            }
          />
        )}
      </div>
    </div>
  );
}
