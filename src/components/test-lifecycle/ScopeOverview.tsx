"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ROW_ICON_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlScopes } from "@/hooks/useTestLifecycle";
import { FEATURE_STATUS_COLOR, FEATURE_STATUS_LABEL, formatRate } from "@/lib/test-lifecycle";
import type { TlFeatureStatus, TlScope } from "@/types/test-lifecycle";

const STATUSES = Object.keys(FEATURE_STATUS_LABEL) as TlFeatureStatus[];
const NO_AREA = "Senza area";
const NOT_DELETABLE_HINT = "Ambito con feature pubblicate o PR aperte: non eliminabile";

export function ScopeOverview({
  selectedScopeId,
  onSelect,
  onEditScope,
  onDeleteScope,
}: {
  selectedScopeId?: string;
  onSelect?: (scopeId: string | undefined) => void;
  onEditScope?: (scope: TlScope) => void;
  onDeleteScope?: (scope: TlScope) => void;
}) {
  const { data: scopes, isLoading, isError } = useTlScopes();
  const { can } = usePermissions();
  const canManage = can("manage:tl_scopes") && !!(onEditScope || onDeleteScope);

  const groups = useMemo(() => {
    const byArea = new Map<string, TlScope[]>();
    for (const s of scopes ?? []) {
      const area = s.area?.trim() || NO_AREA;
      byArea.set(area, [...(byArea.get(area) ?? []), s]);
    }
    return [...byArea.entries()].sort(([a], [b]) =>
      a === NO_AREA ? 1 : b === NO_AREA ? -1 : a.localeCompare(b),
    );
  }, [scopes]);

  if (isError) {
    return <p role="alert" className="text-danger text-[13px]">Impossibile caricare gli ambiti.</p>;
  }
  if (isLoading) return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  if (groups.length === 0) {
    return <p className="text-text-muted text-[13px]">Nessun ambito definito</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([area, items]) => (
        <section key={area} className="flex flex-col gap-2">
          <h2 className="text-[11px] font-mono uppercase font-medium text-text-muted" style={{ letterSpacing: ".08em" }}>
            {area}
          </h2>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {items.map((s) => {
              const selected = s.id === selectedScopeId;
              return (
                <div key={s.id} className="relative group">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect?.(selected ? undefined : s.id)}
                    className={`w-full h-full text-left rounded-[var(--radius)] border p-3 flex flex-col gap-2 transition-colors hover:bg-subtle ${
                      selected ? "border-accent bg-accent-soft" : "border-border bg-surface"
                    }`}
                  >
                    <div className={`flex items-baseline justify-between gap-2 ${canManage ? "pr-14" : ""}`}>
                      <span className="font-mono font-semibold text-[13px]">{s.code}</span>
                      <span className="font-mono text-[12px] text-text-muted">
                        {s.feature_count} feature
                      </span>
                    </div>
                    <span className="text-[13px] text-text-dim">{s.name}</span>
                    {formatRate(s.nrt_pass_rate) && (
                      <span className="font-mono text-[12px] text-text-muted" title="Pass rate NRT sulle ultime run degli scenari">
                        NRT {formatRate(s.nrt_pass_rate)}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.filter((st) => (s.status_counts[st] ?? 0) > 0).map((st) => (
                        <span
                          key={st}
                          className="font-mono rounded-full whitespace-nowrap"
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            color: FEATURE_STATUS_COLOR[st].color,
                            background: FEATURE_STATUS_COLOR[st].bg,
                          }}
                        >
                          {FEATURE_STATUS_LABEL[st]} {s.status_counts[st]}
                        </span>
                      ))}
                    </div>
                  </button>
                  {canManage && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5">
                      {onEditScope && (
                        <button
                          type="button"
                          aria-label={`Modifica ambito ${s.code}`}
                          title="Modifica"
                          className={ROW_ICON_CLASS}
                          onClick={() => onEditScope(s)}
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                      )}
                      {onDeleteScope && (
                        <button
                          type="button"
                          aria-label={`Elimina ambito ${s.code}`}
                          title={s.deletable ? "Elimina" : NOT_DELETABLE_HINT}
                          disabled={!s.deletable}
                          className={`${ROW_ICON_CLASS} hover:!text-danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:!text-text-muted`}
                          onClick={() => onDeleteScope(s)}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
