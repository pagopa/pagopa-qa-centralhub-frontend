"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Plus, Settings, ArrowRightLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { CreateFeatureDialog } from "@/components/test-lifecycle/CreateFeatureDialog";
import { FeatureTable } from "@/components/test-lifecycle/FeatureTable";
import { GitSyncButton } from "@/components/test-lifecycle/GitSyncButton";
import { ScopeManagerDialog } from "@/components/test-lifecycle/ScopeManagerDialog";
import { ScopeOverview } from "@/components/test-lifecycle/ScopeOverview";
import { TlDeleteDialog, type TlDeleteTarget } from "@/components/test-lifecycle/TlDeleteDialog";
import type { TlFeatureFilters, TlScope } from "@/types/test-lifecycle";
import { Gate } from "@/lib/permissions";
import { useTlIssues } from "@/hooks/useTestLifecycle";

export default function TestLifecyclePage() {
  const { status } = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [scopesOpen, setScopesOpen] = useState(false);
  // Remounting the manager (new key) is how it opens straight on a scope's edit form.
  const [scopesDialog, setScopesDialog] = useState<{ key: number; edit?: TlScope }>({ key: 0 });
  const [deleteTarget, setDeleteTarget] = useState<TlDeleteTarget | null>(null);
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

  const openScopes = (edit?: TlScope) => {
    setScopesDialog((prev) => ({ key: prev.key + 1, edit }));
    setScopesOpen(true);
  };
  const askDeleteScope = (scope: TlScope) => {
    setScopesOpen(false);
    setDeleteTarget({ kind: "scope", id: scope.id, label: scope.code });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-text">Test Lifecycle</h1>
        <div className="flex items-start gap-2 flex-wrap">
          <Link
            href="/test-lifecycle/guida"
            className={SECONDARY_BUTTON_CLASS}
          >
            <BookOpen size={16} aria-hidden /> Guida
          </Link>
          <Link
            href="/test-lifecycle/anomalie"
            className={SECONDARY_BUTTON_CLASS}
          >
            <AlertTriangle size={16} aria-hidden /> Anomalie ({openIssues})
          </Link>
          <Gate action="manage:tl_git">
            <GitSyncButton disabled={status === "loading"} />
          </Gate>
          <Gate action="manage:tl_migration">
            <Link
              href="/test-lifecycle/migrazione"
              className={SECONDARY_BUTTON_CLASS}
            >
              <ArrowRightLeft size={16} aria-hidden /> Migrazione
            </Link>
          </Gate>
          <Gate action="manage:tl_scopes">
            <button
              onClick={() => openScopes()}
              className={SECONDARY_BUTTON_CLASS}
            >
              <Settings size={16} aria-hidden /> Gestisci ambiti
            </button>
          </Gate>
          <Gate action="edit:tl_feature">
            <button
              onClick={() => setCreateOpen(true)}
              disabled={status === "loading"}
              className={PRIMARY_BUTTON_CLASS}
            >
              <Plus size={16} aria-hidden /> Nuova feature
            </button>
          </Gate>
        </div>
      </div>

      <ScopeOverview
        selectedScopeId={scopeId}
        onSelect={selectScope}
        onEditScope={openScopes}
        onDeleteScope={askDeleteScope}
      />

      <FeatureTable filters={filters} onFiltersChange={setFilters} />

      <Gate action="manage:tl_scopes">
        <ScopeManagerDialog
          key={scopesDialog.key}
          open={scopesOpen}
          onOpenChange={setScopesOpen}
          onDeleteScope={askDeleteScope}
          initialEditScope={scopesDialog.edit}
        />
      </Gate>
      <Gate action="edit:tl_feature">
        <CreateFeatureDialog open={createOpen} onOpenChange={setCreateOpen} defaultScopeId={scopeId} />
      </Gate>

      <TlDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          if (deleteTarget?.kind === "scope" && deleteTarget.id === scopeId) selectScope(undefined);
        }}
      />
    </div>
  );
}
