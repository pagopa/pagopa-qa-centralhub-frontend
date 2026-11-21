"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { MigrationItemDialog } from "@/components/test-lifecycle/MigrationItemDialog";
import { MigrationItemsTable } from "@/components/test-lifecycle/MigrationItemsTable";
import { MigrationScopeCard } from "@/components/test-lifecycle/MigrationScopeCard";
import { MigrationTagsPanel } from "@/components/test-lifecycle/MigrationTagsPanel";
import { PRIMARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useAnalyzeTlMigration,
  usePatchTlMigrationItem,
  useTlMigration,
  useTlMigrationItems,
} from "@/hooks/useTestLifecycle";
import { apiErrorMessage } from "@/lib/test-lifecycle";
import type { TlMigrationItem, TlMigrationItemFilters } from "@/types/test-lifecycle";

const PROBLEMS: Record<string, string> = {
  number_conflict: "Numero doppio",
  page_without_file: "Pagina senza file",
  file_without_page: "File senza pagina",
  multiple_files: "Più file",
  duplicate_identity_tag: "Tag identità condiviso",
  parse_error: "File illeggibile",
  owner_not_found: "Owner non trovato",
  reviewer_not_found: "Reviewer non trovato",
  reviewer_is_team: "Reviewer di gruppo",
  fixture_or_copy: "Fixture o copia",
  no_code: "Senza codice",
  draft_with_file: "Bozza con file",
  changed_since_analysis: "Cambiata dopo l'analisi",
  jira_key_not_found: "Chiave Jira inesistente",
};

export default function MigrationPage() {
  const { can } = usePermissions();
  if (!can("manage:tl_migration")) {
    return <p className="text-[13px] text-text-muted">Serve il permesso di migrazione per aprire questa pagina.</p>;
  }
  return <MigrationContent />;
}

function MigrationContent() {
  const summary = useTlMigration();
  const analyze = useAnalyzeTlMigration();
  const patch = usePatchTlMigrationItem();
  const [filters, setFilters] = useState<TlMigrationItemFilters>({});
  const items = useTlMigrationItems(filters);
  const all = useTlMigrationItems({});
  const [editing, setEditing] = useState<TlMigrationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = summary.data;

  const cleanByScope = useMemo(() => {
    const map = new Map<string, TlMigrationItem[]>();
    for (const it of all.data ?? []) {
      if (it.executed_at || it.decision !== "pending" || it.problems.length > 0) continue;
      const key = it.effective.scope_code ?? "";
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [all.data]);

  const setFilter = <K extends keyof TlMigrationItemFilters>(key: K, value: string) =>
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value as TlMigrationItemFilters[K];
      else delete next[key];
      return next;
    });

  const runAnalyze = async () => {
    setError(null);
    try {
      await analyze.mutateAsync();
    } catch (err) {
      setError(apiErrorMessage(err) ?? "Analisi non riuscita.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link href="/test-lifecycle" className="flex items-center gap-1 text-[13px] text-text-muted hover:text-text w-fit">
        <ChevronLeft size={14} /> Test Lifecycle
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text">Migrazione da Confluence</h1>
        <div className="flex items-center gap-3">
          {data?.analyzed_at && (
            <span className="text-[12px] text-text-muted">
              Ultima analisi: {new Date(data.analyzed_at).toLocaleString("it-IT")}
            </span>
          )}
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={analyze.isPending} onClick={() => void runAnalyze()}>
            {analyze.isPending ? "Analisi in corso…" : "Analizza"}
          </button>
        </div>
      </div>
      <p className="text-[13px] text-text-dim">
        L&apos;analisi legge le pagine FEAT di Confluence e i feature file su Git senza modificare nulla. Conferma o
        correggi le righe, poi esegui un ambito alla volta: l&apos;hub crea le feature e apre la PR di allineamento.
      </p>
      {data && !data.confluence_write && (
        <p className="rounded-[var(--radius-sm)] px-3 py-2 text-[13px]" style={{ color: "var(--info)", background: "var(--info-soft)" }}>
          La scrittura su Confluence è disattivata: le pagine non verranno marcate come migrate.
        </p>
      )}
      {(error || data?.error) && <p role="alert" className="text-danger text-[13px]">{error ?? data?.error}</p>}

      {data && data.scopes.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {data.scopes.map((s) => {
            const clean = cleanByScope.get(s.scope_code) ?? [];
            return (
              <MigrationScopeCard
                key={s.scope_code || "-"}
                scope={s}
                cleanPending={clean.length}
                onConfirmClean={() => clean.forEach((it) => patch.mutate({ id: it.id, decision: "confirmed" }))}
              />
            );
          })}
        </div>
      )}

      {data && <MigrationTagsPanel tags={data.tags} />}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Ambito
          <select className={SELECT_CLASS} value={filters.scope_code ?? ""} onChange={(e) => setFilter("scope_code", e.target.value)}>
            <option value="">Tutti</option>
            {(data?.scopes ?? []).filter((s) => s.scope_code).map((s) => (
              <option key={s.scope_code} value={s.scope_code}>{s.scope_code}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Decisione
          <select className={SELECT_CLASS} value={filters.decision ?? ""} onChange={(e) => setFilter("decision", e.target.value)}>
            <option value="">Tutte</option>
            <option value="pending">Da decidere</option>
            <option value="confirmed">Confermate</option>
            <option value="excluded">Escluse</option>
            <option value="executed">Eseguite</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Problema
          <select className={SELECT_CLASS} value={filters.problem ?? ""} onChange={(e) => setFilter("problem", e.target.value)}>
            <option value="">Tutti</option>
            {Object.entries(PROBLEMS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {items.isError ? (
        <p role="alert" className="text-[13px] text-text-muted">Impossibile caricare le righe.</p>
      ) : items.isLoading ? (
        <p className="text-[13px] text-text-muted">Caricamento…</p>
      ) : (
        <MigrationItemsTable items={items.data ?? []} onEdit={setEditing} />
      )}

      {editing && (
        <MigrationItemDialog
          key={editing.id}
          item={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
