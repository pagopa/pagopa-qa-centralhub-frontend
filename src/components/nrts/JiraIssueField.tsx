import type { ChangeEventHandler, FocusEventHandler } from "react";

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

  return (
    <div>
      <dt className="text-text-muted">{label}:</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          className="border border-border bg-surface w-[80%] text-text text-base px-2 py-1"
        />
        {issueNotFound && <span className="text-danger text-[12px]">Nessuna issue Jira trovata</span>}
      </dd>
    </div>
  );
}
