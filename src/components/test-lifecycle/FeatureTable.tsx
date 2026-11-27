"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { ROW_ICON_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { Gate } from "@/lib/permissions";
import { useTlFeatures, useTlScopes } from "@/hooks/useTestLifecycle";
import { useUsers } from "@/hooks/useUsers";
import { FEATURE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlFeatureFilters, TlFeatureStatus } from "@/types/test-lifecycle";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { MoveFeaturesDialog } from "./MoveFeaturesDialog";
import { TlDeleteDialog, type TlDeleteTarget } from "./TlDeleteDialog";

const LABEL_CLASS = "flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted";
const TH_CLASS = "px-4 py-2 font-mono text-[11px] uppercase font-medium text-text-muted";
const NOT_DELETABLE_HINT = "Feature pubblicata su Git o con PR aperta: non eliminabile";

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
  const [deleteTarget, setDeleteTarget] = useState<TlDeleteTarget | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  // Only what is on screen counts: a filter that hides a row also drops it from the selection.
  const selectedFeatures = (features ?? []).filter((f) => selected.has(f.id));
  const allSelected = !!features?.length && selectedFeatures.length === features.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

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
        <label className={LABEL_CLASS}>
          Ambito
          <select
            className={SELECT_CLASS}
            value={filters.scope_id ?? ""}
            onChange={(e) => setFilter("scope_id", e.target.value)}
          >
            <option value="">Tutti</option>
            {scopes?.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </label>
        <label className={LABEL_CLASS}>
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
        <label className={LABEL_CLASS}>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <span className="font-mono text-[13px] text-text-muted">{features?.length ?? 0} feature</span>
            <Gate action="edit:tl_feature">
              <div className="flex items-center gap-3">
                {selectedFeatures.length > 0 && (
                  <span className="text-[13px] text-text-dim">
                    {selectedFeatures.length} {selectedFeatures.length === 1 ? "selezionata" : "selezionate"}
                  </span>
                )}
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  disabled={selectedFeatures.length === 0}
                  onClick={() => setMoveOpen(true)}
                >
                  Sposta in…
                </button>
              </div>
            </Gate>
          </div>
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <Gate action="edit:tl_feature">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      aria-label="Seleziona tutte"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set((features ?? []).map((f) => f.id)))
                      }
                    />
                  </th>
                </Gate>
                <th className={`text-left ${TH_CLASS}`}>Codice</th>
                <th className={`text-left ${TH_CLASS}`}>Titolo</th>
                <th className={`text-left ${TH_CLASS}`}>Stato</th>
                <th className={`text-left ${TH_CLASS}`}>Owner design</th>
                <th className={`text-right ${TH_CLASS}`}>Scenari</th>
                <th className="px-3 py-2"><span className="sr-only">Azioni</span></th>
              </tr>
            </thead>
            <tbody>
              {features?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center px-4 py-8 text-text-muted">
                    Nessuna feature trovata
                  </td>
                </tr>
              )}
              {features?.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-subtle transition-colors">
                  <Gate action="edit:tl_feature">
                    <td className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        aria-label={`Seleziona ${f.code}`}
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                      />
                    </td>
                  </Gate>
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
                  <td className="px-4 py-2 text-right font-mono text-[12px] text-text-dim">{f.scenario_count}</td>
                  <td className="px-3 py-2">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Link
                        href={`/test-lifecycle/${f.id}`}
                        aria-label={`Apri feature ${f.code}`}
                        title="Apri"
                        className={ROW_ICON_CLASS}
                      >
                        <Eye size={16} aria-hidden />
                      </Link>
                      <Gate action="edit:tl_feature">
                        <button
                          type="button"
                          aria-label={`Elimina feature ${f.code}`}
                          title={f.deletable ? "Elimina" : NOT_DELETABLE_HINT}
                          disabled={!f.deletable}
                          className={`${ROW_ICON_CLASS} hover:!text-danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:!text-text-muted`}
                          onClick={() => setDeleteTarget({ kind: "feature", id: f.id, label: f.code })}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </Gate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TlDeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <MoveFeaturesDialog
        open={moveOpen}
        features={selectedFeatures.map((f) => ({ id: f.id, code: f.code }))}
        currentScopeIds={[...new Set(selectedFeatures.map((f) => f.scope_id))]}
        onClose={() => setMoveOpen(false)}
        onMoved={() => {
          setMoveOpen(false);
          setSelected(new Set());
        }}
      />
    </div>
  );
}
