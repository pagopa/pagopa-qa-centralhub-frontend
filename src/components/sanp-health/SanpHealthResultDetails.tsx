import type {
  SanpEnvironment,
  SanpHealthChange,
  SanpHealthMatrixCell,
  SanpSeverity,
} from "@/types/index";

interface SanpHealthResultDetailsProps {
  specName: string;
  cells: SanpHealthMatrixCell[];
}

const environmentLabels: Record<SanpEnvironment, string> = {
  SANP: "SANP",
  COLLAUDO: "Collaudo",
  PRODUZIONE: "Produzione",
};

const groups: Array<{ severity: SanpSeverity; label: string }> = [
  { severity: "error", label: "Errori" },
  { severity: "warning", label: "Warning" },
  { severity: "info", label: "Info" },
];

function ChangeDetails({ change }: { change: SanpHealthChange }) {
  return (
    <li className="border-l-2 border-border pl-3 text-xs text-text-dim">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono font-semibold text-text">{change.rule_id}</span>
        {change.operation && (
          <span className="rounded bg-neutral-soft px-1.5 py-0.5 font-mono font-semibold text-text">
            {change.operation}
          </span>
        )}
        {change.path && <span className="font-mono text-text">{change.path}</span>}
        {change.section && (
          <span>
            Sezione: <span className="text-text">{change.section}</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-text">{change.message}</p>
      {change.comment && <p className="mt-1 text-text-muted">{change.comment}</p>}
    </li>
  );
}

function EnvironmentDetails({ cell }: { cell: SanpHealthMatrixCell }) {
  return (
    <section className="min-w-0 py-1" aria-label={environmentLabels[cell.environment]}>
      <div className="mb-3 border-b border-border pb-3">
        <h3 className="text-sm font-semibold text-text">{environmentLabels[cell.environment]}</h3>
        {cell.status === "NOT_CONFIGURED" ? (
          <p className="mt-1 text-xs text-text-muted">Confronto non configurato</p>
        ) : (
          <>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-dim">
              <span>Branch: <strong className="font-mono text-text">{cell.source_branch ?? "-"}</strong></span>
              <span>Target: <strong className="font-mono text-text">{cell.target_apim ?? "-"}</strong></span>
            </p>
            <p className="mt-2 text-sm font-medium text-text">{cell.display_name ?? "-"}</p>
            <p className="mt-0.5 text-xs text-text-dim">{cell.description ?? "-"}</p>
            <p className="mt-2 text-xs font-medium text-text-dim">
              {cell.error_count} errori · {cell.warning_count} warning · {cell.info_count} info
            </p>
          </>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const changes = cell.changes.filter((change) => change.severity === group.severity);
          if (changes.length === 0) return null;
          return (
            <section key={group.severity}>
              <h4 className="mb-2 text-xs font-semibold text-text">
                {group.label} ({changes.length})
              </h4>
              <ul className="space-y-3">
                {changes.map((change) => <ChangeDetails key={change.id} change={change} />)}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function SanpHealthResultDetails({ specName, cells }: SanpHealthResultDetailsProps) {
  return (
    <div
      role="region"
      aria-label={`Dettagli ${specName}`}
      className={`grid gap-5 px-4 py-4 lg:divide-x lg:divide-border [&>section]:lg:pr-5 ${cells.length === 1 ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}
    >
      {cells.map((cell) => <EnvironmentDetails key={cell.environment} cell={cell} />)}
    </div>
  );
}