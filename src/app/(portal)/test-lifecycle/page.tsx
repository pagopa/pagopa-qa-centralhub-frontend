"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Plus, Settings, ArrowRightLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { CreateFeatureDialog } from "@/components/test-lifecycle/CreateFeatureDialog";
import { FeatureTable } from "@/components/test-lifecycle/FeatureTable";
import { GitSyncButton } from "@/components/test-lifecycle/GitSyncButton";
import { ScopeManagerDialog } from "@/components/test-lifecycle/ScopeManagerDialog";
import { ScopeOverview } from "@/components/test-lifecycle/ScopeOverview";
import type { TlFeatureFilters } from "@/types/test-lifecycle";
import { Gate } from "@/lib/permissions";
import { useTlIssues } from "@/hooks/useTestLifecycle";

export default function TestLifecyclePage() {
  const { status } = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [scopesOpen, setScopesOpen] = useState(false);
  const [filters, setFilters] = useState<TlFeatureFilters>({});
  const openIssues = useTlIssues({ status: "open" }).data?.length ?? 0;
  const scopeId = filters.scope_id;
  const selectScope = (id: string | undefined) =>
    setFilters((prev) => {
      const next = { ...prev };
      if (id) next.scope_id = id;
      else delete next.scope_id;
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Test Lifecycle</h1>
        <div className="flex items-start gap-2 flex-wrap">
          <Link
            href="/test-lifecycle/guida"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
          >
            <BookOpen size={14} /> Guida
          </Link>
          <Link
            href="/test-lifecycle/anomalie"
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
          >
            <AlertTriangle size={14} /> Anomalie ({openIssues})
          </Link>
          <Gate action="manage:tl_git">
            <GitSyncButton disabled={status === "loading"} />
          </Gate>
          <Gate action="manage:tl_migration">
            <Link
              href="/test-lifecycle/migrazione"
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
            >
              <ArrowRightLeft size={14} /> Migrazione
            </Link>
          </Gate>
          <Gate action="manage:tl_scopes">
            <button
              onClick={() => setScopesOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface text-text-dim text-[13px] px-3 py-1.5 hover:bg-hover transition-colors"
            >
              <Settings size={14} /> Gestisci ambiti
            </button>
          </Gate>
          <Gate action="edit:tl_feature">
            <button
              onClick={() => setCreateOpen(true)}
              disabled={status === "loading"}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-surface text-[var(--accent)] text-[13px] px-3 py-1.5 hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Nuova feature
            </button>
          </Gate>
        </div>
      </div>

      <ScopeOverview selectedScopeId={scopeId} onSelect={selectScope} />

      <FeatureTable filters={filters} onFiltersChange={setFilters} />

      <Gate action="manage:tl_scopes">
        <ScopeManagerDialog open={scopesOpen} onOpenChange={setScopesOpen} />
      </Gate>
      <Gate action="edit:tl_feature">
        <CreateFeatureDialog open={createOpen} onOpenChange={setCreateOpen} defaultScopeId={scopeId} />
      </Gate>
    </div>
  );
}
