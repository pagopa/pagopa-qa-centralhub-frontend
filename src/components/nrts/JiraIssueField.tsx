import { useId, type ChangeEventHandler, type FocusEventHandler } from "react";
import { ExternalLink } from "lucide-react";
import { INPUT_CLASS } from "@/components/ui/formStyles";
import { buildJiraIssueUrl, parseJiraIssueKey } from "@/utils/jiraIssue";

interface JiraIssueFieldProps {
  field: "product" | "qa";
  value: string;
  issueNotFound: boolean;
  onBlur: FocusEventHandler<HTMLInputElement>;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function JiraIssueField({
  field,
  value,
  issueNotFound,
  onBlur,
  onChange,
}: JiraIssueFieldProps) {
  const label = field === "product" ? "Ticket prodotto" : "Ticket QA";
  const issueKey = parseJiraIssueKey(value);
  const inputId = `${useId()}-jira-issue-${field}`;

  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-dim">
        <label htmlFor={inputId}>{label}</label>
      </dt>
      <dd className="mt-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="text"
            value={value}
            onBlur={onBlur}
            onChange={onChange}
            placeholder={field === "product" ? "es. PIDM-1234 o URL Jira" : "es. PQ-825 o URL Jira"}
            className={`${INPUT_CLASS} h-8 w-full text-[13px]`}
          />
          {issueKey && (
            <a
              href={buildJiraIssueUrl(issueKey)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apri ticket Jira"
              title="Apri ticket Jira"
              className="shrink-0 text-text-muted hover:text-text"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
        {issueNotFound && <span className="text-[12px] text-danger">Nessuna issue Jira trovata</span>}
      </dd>
    </div>
  );
}
