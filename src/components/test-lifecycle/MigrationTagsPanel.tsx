"use client";

import { usePatchTlMigrationTag } from "@/hooks/useTestLifecycle";
import type { TlMigrationTag } from "@/types/test-lifecycle";

/** Tag non identità trovati nei file: mantenuti come tag di categoria o rimossi. */
export function MigrationTagsPanel({ tags }: { tags: TlMigrationTag[] }) {
  const patch = usePatchTlMigrationTag();
  if (tags.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-text">Tag trovati nei feature file</h2>
        <p className="text-[13px] text-text-dim">
          <strong>Cosa fare:</strong> prima di eseguire un ambito, togli la spunta ai tag che non vuoi portare nell&apos;hub.
          Lascia spuntati tutti gli altri.
        </p>
      </div>
      <ul className="flex flex-col gap-1 text-[12px] text-text-muted">
        <li>
          <strong className="text-text-dim">Spuntato = mantieni</strong>: il tag resta sugli scenari migrati e nel file
          riscritto dalla PR di allineamento, e diventa selezionabile su tutti gli scenari. Se nel file era sulla
          feature intera, viene copiato su ogni scenario.
        </li>
        <li>
          <strong className="text-text-dim">Senza spunta = rimuovi</strong>: il tag sparisce dagli scenari migrati e, dopo
          il merge della PR di allineamento, anche dal file su Git.
        </li>
        <li>
          <strong className="text-text-dim">Spunta bloccata</strong>: @runnable, @e2e, @ui e @skip servono alle run NRT e
          restano sempre.
        </li>
        <li>
          Nel dubbio <strong className="text-text-dim">mantieni</strong>: un tag si toglie facilmente dopo, recuperarlo no.
          La scelta vale per gli ambiti eseguiti da questo momento in poi; quelli già eseguiti non cambiano.
        </li>
        <li>
          I tag identità (es. @FEAT_008_Checkout) e @positivo / @negativo non compaiono qui: l&apos;hub li gestisce da solo.
        </li>
      </ul>
      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li key={t.name}>
            <label
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px]"
              style={{ borderColor: t.decision === "keep" ? "var(--border)" : "var(--danger)" }}
              title={t.category ? "Tag usato dalle run NRT: resta sempre" : undefined}
            >
              <input
                type="checkbox"
                aria-label={`Mantieni @${t.name}`}
                checked={t.decision === "keep"}
                disabled={t.category || patch.isPending}
                onChange={() => patch.mutate({ name: t.name, decision: t.decision === "keep" ? "drop" : "keep" })}
              />
              <span className={`font-mono ${t.decision === "keep" ? "" : "line-through"}`}>@{t.name}</span>
              <span className="text-text-muted">{t.occurrences} {t.occurrences === 1 ? "volta" : "volte"}</span>
              {t.decision !== "keep" && <span className="text-danger">rimosso</span>}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
