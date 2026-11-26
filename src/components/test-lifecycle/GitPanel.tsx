"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import {
  usePublishTlRevision,
  useTlBranchSync,
  useTlIssues,
  useUpdateTlIssue,
} from "@/hooks/useTestLifecycle";
import { apiErrorMessage, BRANCH_SYNC_LABEL, PR_STATE_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
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
  const source = feature.import_source;
  const sourceUrl = safeHttpUrl(source?.url);
  const [error, setError] = useState<string | null>(null);

  const revision = feature.working_revision ?? feature.published_revision;
  const prUrl = safeHttpUrl(revision?.pr_url);
  // The state is only meaningful while the revision can still change on its branch: a merged one
  // keeps its branch name, but the branch may be gone and "Branch da creare" would be wrong.
  const syncing =
    !!revision?.work_branch &&
    (revision.status === "draft" || revision.status === "in_review" || revision.status === "approved");
  const sync = useTlBranchSync(feature.id, revision?.id, syncing);
  const compareUrl = safeHttpUrl(sync.data?.compare_url);
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
        <dt className="text-text-muted">Branch di lavoro</dt>
        <dd className="flex flex-wrap items-center gap-2 text-text">
          {revision?.work_branch ? (
            <>
              <span className="font-mono break-all">{revision.work_branch}</span>
              {sync.data && <span className="text-text-muted">{BRANCH_SYNC_LABEL[sync.data.state]}</span>}
              {compareUrl && (
                <a href={compareUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                  Confronta su GitHub
                </a>
              )}
            </>
          ) : (
            <span className="text-text-muted">{BRANCH_SYNC_LABEL.no_branch}</span>
          )}
        </dd>
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
