"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { IssueList } from "@/components/test-lifecycle/IssueList";
import { SELECT_CLASS } from "@/components/ui/formStyles";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlIssues, useUpdateTlIssue } from "@/hooks/useTestLifecycle";
import { ISSUE_KIND_LABEL, ISSUE_STATUS_LABEL } from "@/lib/test-lifecycle";
import type { TlIssueFilters, TlIssueKind, TlIssueStatus } from "@/types/test-lifecycle";

export default function TestLifecycleIssuesPage() {
  const { can } = usePermissions();
  const [filters, setFilters] = useState<TlIssueFilters>({ status: "open" });
  const issues = useTlIssues(filters);
  const update = useUpdateTlIssue();

  const setFilter = <K extends keyof TlIssueFilters>(key: K, value: TlIssueFilters[K] | "") =>
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value as TlIssueFilters[K];
      else delete next[key];
      return next;
    });

  return (
    <div className="flex flex-col gap-5">
      <Link href="/test-lifecycle" className="flex items-center gap-1 text-[13px] text-text-muted hover:text-text w-fit">
        <ChevronLeft size={14} /> Test Lifecycle
      </Link>
      <h1 className="text-xl font-semibold text-text">Anomalie</h1>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Stato
          <select
            className={SELECT_CLASS}
            value={filters.status ?? ""}
            onChange={(e) => setFilter("status", e.target.value as TlIssueStatus | "")}
          >
            <option value="">Tutti</option>
            {(Object.keys(ISSUE_STATUS_LABEL) as TlIssueStatus[]).map((s) => (
              <option key={s} value={s}>{ISSUE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Tipo
          <select
            className={SELECT_CLASS}
            value={filters.kind ?? ""}
            onChange={(e) => setFilter("kind", e.target.value as TlIssueKind | "")}
          >
            <option value="">Tutti</option>
            {(Object.keys(ISSUE_KIND_LABEL) as TlIssueKind[]).map((k) => (
              <option key={k} value={k}>{ISSUE_KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
      </div>
      {issues.isLoading ? (
        <p className="text-[13px] text-text-muted">Caricamento…</p>
      ) : issues.isError ? (
        <p role="alert" className="text-[13px] text-text-muted">Impossibile caricare le anomalie.</p>
      ) : (
        <IssueList
          issues={issues.data ?? []}
          canManage={can("manage:tl_git")}
          showFeature
          pending={update.isPending}
          onUpdate={(issue, status) =>
            void update.mutateAsync({ issueId: issue.id, status, featureId: issue.feature_id })
          }
        />
      )}
    </div>
  );
}
