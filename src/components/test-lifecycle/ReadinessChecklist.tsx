import { Check, X } from "lucide-react";

const COPY = {
  submit: { title: "Prima di inviare in review", ready: "Pronta per l'invio in review" },
  approve: { title: "Prima di approvare", ready: "Pronta per l'approvazione" },
} as const;

/**
 * What stands between the draft and its next workflow step. The items are the reasons the backend
 * reports for the primary transition (no rules invented here); no reasons means it is ready.
 */
export function ReadinessChecklist({
  action,
  reasons,
}: {
  action: keyof typeof COPY;
  reasons: string[];
}) {
  const copy = COPY[action];
  if (reasons.length === 0) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-success">
        <Check size={16} aria-hidden /> {copy.ready}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-sm)] border border-border bg-subtle p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase font-medium text-text-muted">{copy.title}</span>
        <span className="font-mono text-[11px] text-text-muted">{reasons.length} da risolvere</span>
      </div>
      <ul className="flex flex-col gap-1">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-2 text-[13px] text-text-dim">
            <X size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
