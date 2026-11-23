"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SELECT_CLASS } from "@/components/ui/formStyles";
import { useTlFeatures, useTlScopes } from "@/hooks/useTestLifecycle";
import { useUsers } from "@/hooks/useUsers";
import { FEATURE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlFeatureFilters, TlFeatureStatus } from "@/types/test-lifecycle";
import { FeatureStatusBadge } from "./FeatureStatusBadge";

const STATUSES = Object.keys(FEATURE_STATUS_LABEL) as TlFeatureStatus[];

export function FeatureTable({
  filters,
  onFiltersChange,
}: {
  filters: TlFeatureFilters;
  onFiltersChange: (filters: TlFeatureFilters) => void;
}) {
  const { data: features, isLoading, isError } = useTlFeatures(filters);
  const { data: scopes } = useTlScopes();
  const { data: users } = useUsers();

  const userNames = useMemo(
    () => new Map((users?.items ?? []).map((u) => [u.id, u.name])),
    [users],
  );

  const setFilter = (key: keyof TlFeatureFilters, value: string) => {
    const next = { ...filters };
    if (value) (next as Record<string, string>)[key] = value;
    else delete next[key];
    onFiltersChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Ambito
          <select
            className={SELECT_CLASS}
            value={filters.scope_id ?? ""}
            onChange={(e) => setFilter("scope_id", e.target.value)}
          >
            <option value="">Tutti</option>
            {scopes?.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Stato
          <select
            className={SELECT_CLASS}
            value={filters.status ?? ""}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">Tutti</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{FEATURE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-dim">
          Persona
          <select
            className={SELECT_CLASS}
            value={filters.owner_id ?? ""}
            onChange={(e) => setFilter("owner_id", e.target.value)}
          >
            <option value="">Tutti</option>
            {users?.items.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
      </div>

      {isError ? (
        <p role="alert" className="text-danger text-[13px]">Impossibile caricare le feature.</p>
      ) : isLoading ? (
        <p className="text-text-muted text-[13px]">Caricamento…</p>
      ) : (
        <div className="rounded-[var(--radius)] border border-border overflow-x-auto bg-surface">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th className="text-left px-4 py-2 font-medium text-text-muted">Codice</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Titolo</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Stato</th>
                <th className="text-left px-4 py-2 font-medium text-text-muted">Owner design</th>
                <th className="text-right px-4 py-2 font-medium text-text-muted">Scenari</th>
              </tr>
            </thead>
            <tbody>
              {features?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center px-4 py-8 text-text-muted">
                    Nessuna feature trovata
                  </td>
                </tr>
              )}
              {features?.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/test-lifecycle/${f.id}`} className="text-accent hover:underline">
                      {f.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{f.title ?? <span className="text-text-muted">(senza titolo)</span>}</td>
                  <td className="px-4 py-2"><FeatureStatusBadge status={f.status} /></td>
                  <td className="px-4 py-2 text-text-dim">
                    {(f.design_owner_id && userNames.get(f.design_owner_id)) || "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-text-dim">{f.scenario_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
