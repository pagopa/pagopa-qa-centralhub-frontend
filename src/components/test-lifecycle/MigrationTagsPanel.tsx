"use client";

import { usePatchTlMigrationTag } from "@/hooks/useTestLifecycle";
import type { TlMigrationTag } from "@/types/test-lifecycle";

/** Tag non identità trovati nei file: mantenuti come tag di categoria o rimossi. */
export function MigrationTagsPanel({ tags }: { tags: TlMigrationTag[] }) {
  const patch = usePatchTlMigrationTag();
  if (tags.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3">
      <h2 className="text-sm font-semibold text-text">Tag trovati nei feature file</h2>
      <p className="text-[12px] text-text-muted">
        I tag mantenuti diventano tag di categoria degli scenari; quelli rimossi spariscono dai file allineati.
        I tag usati dalle run NRT (@runnable, @e2e, @skip) sono sempre mantenuti.
      </p>
      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li key={t.name}>
            <label className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[12px]">
              <input
                type="checkbox"
                aria-label={`Mantieni @${t.name}`}
                checked={t.decision === "keep"}
                disabled={t.category || patch.isPending}
                onChange={() => patch.mutate({ name: t.name, decision: t.decision === "keep" ? "drop" : "keep" })}
              />
              <span className="font-mono">@{t.name}</span>
              <span className="text-text-muted">{t.occurrences} scenari</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
