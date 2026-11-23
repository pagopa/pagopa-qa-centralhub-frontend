"use client";

import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateTlFeature } from "@/hooks/useTestLifecycle";
import { safeHttpUrl, writeErrorMessage } from "@/lib/test-lifecycle";
import type { TlFeatureDetail } from "@/types/test-lifecycle";

/** Feature migrata da Confluence: origine, allineamento Git in attesa, nota di migrazione. */
export function MigrationInfo({ feature }: { feature: TlFeatureDetail }) {
  const { can } = usePermissions();
  const update = useUpdateTlFeature();
  const [note, setNote] = useState(feature.migration_note ?? "");
  const [error, setError] = useState<string | null>(null);
  if (!feature.migrated_from) return null;

  const editable = can("edit:tl_feature");
  const url = safeHttpUrl(feature.migrated_from.page_url);
  const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]";
  const save = () => {
    const next = note.trim() || null;
    if (!editable || next === (feature.migration_note ?? null)) return;
    setError(null);
    update.mutate(
      { id: feature.id, migration_note: next },
      { onError: (err: unknown) => setError(writeErrorMessage(err)) },
    );
  };

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 text-[13px]">
      <div className="flex flex-wrap gap-2">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${badge} hover:underline`}
            style={{ color: "var(--info)", background: "var(--info-soft)" }}>
            Migrata da Confluence
          </a>
        ) : (
          <span className={badge} style={{ color: "var(--info)", background: "var(--info-soft)" }}>
            Migrata da Confluence
          </span>
        )}
        {feature.alignment_pending && (
          <span className={badge} style={{ color: "var(--warning)", background: "var(--warning-soft)" }}>
            Allineamento Git in attesa: la PR di allineamento dell&apos;ambito non è ancora integrata
          </span>
        )}
      </div>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Nota di migrazione
        <textarea
          className="min-h-16 rounded-[var(--radius-sm)] border border-border-strong bg-surface p-2 text-[13px] text-text outline-none focus:border-accent"
          value={note}
          readOnly={!editable}
          onChange={(e) => setNote(e.target.value)}
          onBlur={save}
        />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </section>
  );
}
