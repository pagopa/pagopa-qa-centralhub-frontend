import { useId, type ChangeEventHandler, type FocusEventHandler } from "react";
import { INPUT_CLASS } from "@/components/ui/formStyles";

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
  const inputId = `${useId()}-jira-issue-${field}`;

  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-dim">
        <label htmlFor={inputId}>{label}</label>
      </dt>
      <dd className="mt-1 flex flex-col gap-1">
        <input
          id={inputId}
          type="text"
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          placeholder={field === "product" ? "es. PIDM-1234" : "es. PQ-825"}
          className={`${INPUT_CLASS} h-8 w-full text-[13px]`}
        />
        {issueNotFound && <span className="text-[12px] text-danger">Nessuna issue Jira trovata</span>}
      </dd>
    </div>
  );
}
