"use client";

import Link from "next/link";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { ISSUE_KIND_LABEL, ISSUE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlIssue } from "@/types/test-lifecycle";

function issueMessage(issue: TlIssue): string | null {
  const detail = issue.detail ?? {};
  if (typeof detail.message === "string") return detail.message;
  const changes = detail.changes;
  if (Array.isArray(changes)) {
    const messages = changes
      .map((c) => (c && typeof c === "object" && typeof (c as { message?: unknown }).message === "string"
        ? (c as { message: string }).message
        : null))
      .filter((m): m is string => !!m);
    if (messages.length) return messages.join("; ");
  }
  return null;
}

export function IssueList({
  issues,
  canManage,
  onUpdate,
  showFeature = false,
  pending = false,
}: {
  issues: TlIssue[];
  canManage: boolean;
  onUpdate: (issue: TlIssue, status: "acknowledged" | "resolved") => void;
  showFeature?: boolean;
  pending?: boolean;
}) {
  if (issues.length === 0) {
    return <p className="text-[13px] text-text-muted">Nessuna anomalia.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue) => {
        const message = issueMessage(issue);
        return (
          <li key={issue.id} className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[13px]">
                  <span className="font-medium text-text">{ISSUE_KIND_LABEL[issue.kind] ?? issue.kind}</span>
                  <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "var(--neutral-soft)", color: "var(--text-dim)" }}>
                    {ISSUE_STATUS_LABEL[issue.status]}
                  </span>
                  {showFeature && issue.feature_id && (
                    <Link href={`/test-lifecycle/${issue.feature_id}`} className="font-mono text-[12px] text-[var(--accent)] hover:underline">
                      {issue.feature_code ?? "Feature"}
                    </Link>
                  )}
                </div>
                {issue.path && <span className="font-mono text-[12px] text-text-muted break-all">{issue.path}</span>}
                {message && <span className="text-[12px] text-text-dim break-words">{message}</span>}
              </div>
              {canManage && issue.status !== "resolved" && (
                <div className="flex items-center gap-2">
                  {issue.status === "open" && (
                    <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={pending} onClick={() => onUpdate(issue, "acknowledged")}>
                      Presa visione
                    </button>
                  )}
                  <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={pending} onClick={() => onUpdate(issue, "resolved")}>
                    Risolta
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
