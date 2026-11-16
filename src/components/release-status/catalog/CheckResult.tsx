import { Check, TriangleAlert, X } from "lucide-react";
import type { CheckResult as CheckResultData, CheckTarget } from "@/types/release-status";

function Row({ label, target }: { label: string; target: CheckTarget }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="w-12 font-medium text-text-muted">{label}</span>
      {target.ok ? (
        <span className="inline-flex items-center gap-1 text-success">
          <Check className="size-3.5" aria-hidden="true" />
          <span>✓ {target.version ?? "—"}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-danger">
          <X className="size-3.5" aria-hidden="true" />
          <span>✗ {target.detail ?? "Non raggiungibile"}</span>
        </span>
      )}
    </li>
  );
}

export function CheckResult({ result }: { result: CheckResultData }) {
  const targets = [result.repo, ...Object.values(result.envs)];
  const failed = targets.some((t) => !t.ok);
  return (
    <div aria-label="Esito verifica" className="flex flex-col gap-2 rounded-md border border-border bg-subtle px-3 py-2">
      <ul className="flex flex-col gap-1">
        <Row label="REPO" target={result.repo} />
        {Object.entries(result.envs).map(([env, target]) => (
          <Row key={env} label={env} target={target} />
        ))}
      </ul>
      {failed && (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          Alcune verifiche non sono riuscite: puoi comunque salvare.
        </p>
      )}
    </div>
  );
}
