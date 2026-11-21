"use client";

import Link from "next/link";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { usePatchTlMigrationItem } from "@/hooks/useTestLifecycle";
import { FEATURE_STATUS_LABEL, safeHttpUrl } from "@/lib/test-lifecycle";
import type { TlMigrationItem } from "@/types/test-lifecycle";

const DECISION_LABEL = { pending: "Da decidere", confirmed: "Confermata", excluded: "Esclusa" } as const;

/** Righe di migrazione: proposta effettiva, problemi, decisione rapida o correzione. */
export function MigrationItemsTable({
  items,
  onEdit,
}: {
  items: TlMigrationItem[];
  onEdit: (item: TlMigrationItem) => void;
}) {
  const patch = usePatchTlMigrationItem();
  if (items.length === 0) {
    return <p className="text-[13px] text-text-muted">Nessuna riga con questi filtri.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-sm)] border border-border">
      {items.map((item) => {
        const eff = item.effective;
        const pageUrl = safeHttpUrl(item.page_url);
        const code = eff.number != null ? `FEAT_${String(eff.number).padStart(3, "0")}_${eff.scope_code}` : "Senza codice";
        return (
          <li key={item.id} data-testid={`migration-row-${item.id}`} className="flex flex-col gap-1.5 px-3 py-2 text-[13px]">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-text">{code}</span>
              <span className="min-w-0 flex-1 truncate text-text">{eff.title}</span>
              <span className="text-text-muted">{FEATURE_STATUS_LABEL[eff.status]}</span>
              <span className="text-text-muted">
                {item.executed_at ? "Eseguita" : DECISION_LABEL[item.decision]}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-dim">
              {item.page_title ? (
                pageUrl ? (
                  <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                    {item.page_title}
                  </a>
                ) : (
                  <span>{item.page_title}</span>
                )
              ) : (
                <span>Nessuna pagina</span>
              )}
              <span className="font-mono break-all">{eff.file_path ?? "Nessun file"}</span>
            </div>
            {item.problems.length > 0 && !item.executed_at && (
              <ul className="flex flex-wrap gap-1.5">
                {item.problems.map((p, i) => (
                  <li
                    key={`${p.code}-${i}`}
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{ color: "var(--warning)", background: "var(--warning-soft)" }}
                  >
                    {p.message}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {item.executed_at ? (
                item.feature_id && (
                  <Link href={`/test-lifecycle/${item.feature_id}`} className="text-[12px] text-[var(--accent)] hover:underline">
                    Apri feature
                  </Link>
                )
              ) : (
                <>
                  {item.decision !== "confirmed" && (
                    <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={patch.isPending}
                      onClick={() => patch.mutate({ id: item.id, decision: "confirmed" }, {})}>
                      Conferma
                    </button>
                  )}
                  {item.decision !== "excluded" && (
                    <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={patch.isPending}
                      onClick={() => patch.mutate({ id: item.id, decision: "excluded" }, {})}>
                      Escludi
                    </button>
                  )}
                  <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={() => onEdit(item)}>
                    Correggi
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
