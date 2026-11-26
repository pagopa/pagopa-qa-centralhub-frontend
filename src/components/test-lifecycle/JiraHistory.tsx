import type { ReactNode } from "react";
import { JIRA_CATEGORY_COLOR, JIRA_CATEGORY_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlJiraHistoryRow, TlJiraLink } from "@/types/test-lifecycle";

/** Revisions still being edited or reviewed; a published current revision is just "Corrente". */
const WORKING_STATUSES = new Set<TlJiraHistoryRow["revision_status"]>(["draft", "in_review", "approved"]);

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

function Task({ link }: { link: TlJiraLink | null }): ReactNode {
  if (!link) {
    return (
      <span className="text-text-muted">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Nessun task</span>
      </span>
    );
  }
  const href = safeHttpUrl(link.url);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--accent)] hover:underline">
            {link.key}
          </a>
        ) : (
          <span className="font-mono text-text">{link.key}</span>
        )}
        <StatusBadge link={link} />
      </div>
      {link.summary && <span className="truncate text-text-dim">{link.summary}</span>}
    </div>
  );
}

/**
 * Jira history of a feature: one row per revision with the design task, the implementation task and
 * the QA epic that revision used, from the first design to the latest change.
 */
export function JiraHistory({ rows }: { rows: TlJiraHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-text-muted">Nessun task Jira collegato</p>;
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border">
      <table aria-label="Storico Jira per revisione" className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border text-text-muted">
            <th scope="col" className="w-32 px-3 py-2 font-normal">Revisione</th>
            <th scope="col" className="px-3 py-2 font-normal">Progettazione</th>
            <th scope="col" className="px-3 py-2 font-normal">Implementazione</th>
            <th scope="col" className="px-3 py-2 font-normal">Epic QA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.revision_number} data-testid={`jira-history-row-${row.revision_number}`} className="align-top">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <div className="flex flex-col items-start gap-1">
                  <span className="font-mono text-text">Rev. {row.revision_number}</span>
                  {row.is_current && (
                    <span className="rounded-full border border-[var(--area-violet)] px-2 text-[11px] text-text">
                      {WORKING_STATUSES.has(row.revision_status) ? "In lavorazione" : "Corrente"}
                    </span>
                  )}
                </div>
              </th>
              <td className="px-3 py-2"><Task link={row.design} /></td>
              <td className="px-3 py-2"><Task link={row.impl} /></td>
              <td className="px-3 py-2"><Task link={row.qa_epic} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
