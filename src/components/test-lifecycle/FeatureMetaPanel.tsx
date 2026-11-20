"use client";

import { useState, type ReactNode } from "react";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useUpdateTlFeature } from "@/hooks/useTestLifecycle";
import { useUsers } from "@/hooks/useUsers";
import { isStaleLockError, safeHttpUrl, writeErrorMessage } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlFeatureUpdate, TlRevision, TlRevisionUpdate } from "@/types/test-lifecycle";
import { StaleLockBanner } from "./StaleLockBanner";

type RevisionPatch = Omit<TlRevisionUpdate, "lock_version">;

interface RevisionDraft {
  title: string;
  requirements_url: string;
  product_issue_key: string;
  reverse_engineering: boolean;
  design_estimate_days: string;
  impl_estimate_days: string;
}

function toRevisionDraft(r: TlRevision | null): RevisionDraft {
  return {
    title: r?.title ?? "",
    requirements_url: r?.requirements_url ?? "",
    product_issue_key: r?.product_issue_key ?? "",
    reverse_engineering: r?.reverse_engineering ?? false,
    design_estimate_days: r?.design_estimate_days ?? "",
    impl_estimate_days: r?.impl_estimate_days ?? "",
  };
}

const orNull = (v: string) => v.trim() || null;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-dim min-w-0">
      {label}
      {children}
    </label>
  );
}

/**
 * Feature metadata (owners, Jira keys) and revision metadata (title,
 * requirements, Epic/Story or reverse engineering, estimates). Local values are
 * seeded once; the page remounts the panel on reload.
 */
export function FeatureMetaPanel({
  feature,
  revision,
  readOnly,
  onSaveRevision,
  onReload,
}: {
  feature: TlFeatureDetail;
  revision: TlRevision | null;
  readOnly: boolean;
  onSaveRevision: (patch: RevisionPatch) => Promise<unknown>;
  onReload: () => void;
}) {
  const { data: users } = useUsers();
  const updateFeature = useUpdateTlFeature();
  const [rev, setRev] = useState<RevisionDraft>(() => toRevisionDraft(revision));
  const [savedRev, setSavedRev] = useState<RevisionDraft>(() => toRevisionDraft(revision));
  const [jira, setJira] = useState({
    jira_design_key: feature.jira_design_key ?? "",
    jira_impl_key: feature.jira_impl_key ?? "",
  });
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveFeature = (patch: TlFeatureUpdate) => {
    if (readOnly) return;
    setError(null);
    updateFeature.mutate({ id: feature.id, ...patch }, { onError: (err) => setError(writeErrorMessage(err)) });
  };

  const saveRevision = async (next: RevisionDraft = rev) => {
    if (readOnly || stale || !revision) return;
    const patch: RevisionPatch = {};
    if (next.title !== savedRev.title && next.title.trim()) patch.title = next.title.trim();
    if (next.requirements_url !== savedRev.requirements_url) patch.requirements_url = orNull(next.requirements_url);
    if (next.product_issue_key !== savedRev.product_issue_key) patch.product_issue_key = orNull(next.product_issue_key);
    if (next.reverse_engineering !== savedRev.reverse_engineering) patch.reverse_engineering = next.reverse_engineering;
    if (next.design_estimate_days !== savedRev.design_estimate_days) patch.design_estimate_days = orNull(next.design_estimate_days);
    if (next.impl_estimate_days !== savedRev.impl_estimate_days) patch.impl_estimate_days = orNull(next.impl_estimate_days);
    if (Object.keys(patch).length === 0) return;
    setError(null);
    try {
      await onSaveRevision(patch);
      setSavedRev(next);
    } catch (err) {
      if (isStaleLockError(err)) setStale(true);
      else setError(writeErrorMessage(err));
    }
  };

  const userSelect = (label: string, key: "design_owner_id" | "reviewer_id" | "impl_owner_id") => {
    const value = feature[key] ?? "";
    if (readOnly) {
      const name = users?.items.find((u) => u.id === value)?.name ?? (value ? "—" : "Nessuno");
      return (
        <Field label={label}>
          <span className="text-[14px] text-text">{name}</span>
        </Field>
      );
    }
    return (
      <Field label={label}>
        <select className={SELECT_CLASS} value={value} onChange={(e) => saveFeature({ [key]: e.target.value || null })}>
          <option value="">Nessuno</option>
          {users?.items.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </Field>
    );
  };

  const text = (label: string, value: string, onChange: (v: string) => void, onBlur: () => void, placeholder?: string) => (
    <Field label={label}>
      <input
        className={INPUT_CLASS}
        value={value}
        readOnly={readOnly}
        placeholder={readOnly ? undefined : placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </Field>
  );

  const requirementsUrl = safeHttpUrl(rev.requirements_url);

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      {stale && <StaleLockBanner onReload={onReload} />}
      <h2 className="text-sm font-semibold text-text">Metadati</h2>

      {text("Titolo", rev.title, (title) => setRev({ ...rev, title }), () => void saveRevision())}

      <div className="grid gap-3 sm:grid-cols-3">
        {userSelect("Owner design", "design_owner_id")}
        {userSelect("Reviewer", "reviewer_id")}
        {userSelect("Owner implementazione", "impl_owner_id")}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {text(
          "Jira progettazione",
          jira.jira_design_key,
          (v) => setJira({ ...jira, jira_design_key: v }),
          () => {
            if (orNull(jira.jira_design_key) !== feature.jira_design_key) saveFeature({ jira_design_key: orNull(jira.jira_design_key) });
          },
          "PQ-123",
        )}
        {text(
          "Jira implementazione",
          jira.jira_impl_key,
          (v) => setJira({ ...jira, jira_impl_key: v }),
          () => {
            if (orNull(jira.jira_impl_key) !== feature.jira_impl_key) saveFeature({ jira_impl_key: orNull(jira.jira_impl_key) });
          },
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 items-end">
        {rev.reverse_engineering ? (
          <Field label="Epic/Story prodotto">
            <span className="text-[14px] text-text-muted">Reverse engineering</span>
          </Field>
        ) : (
          text("Epic/Story prodotto", rev.product_issue_key, (v) => setRev({ ...rev, product_issue_key: v }), () => void saveRevision(), "ABC-123")
        )}
        <label className="flex items-center gap-2 text-[13px] text-text-dim h-9">
          <input
            type="checkbox"
            checked={rev.reverse_engineering}
            disabled={readOnly}
            onChange={(e) => {
              const next = { ...rev, reverse_engineering: e.target.checked };
              setRev(next);
              void saveRevision(next);
            }}
          />
          Reverse engineering (nessuna Epic/Story)
        </label>
      </div>

      {readOnly ? (
        <Field label="Requisiti">
          {requirementsUrl ? (
            <a href={requirementsUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] text-accent underline break-all">
              {rev.requirements_url}
            </a>
          ) : (
            <span className="text-[14px] text-text break-all">{rev.requirements_url || "—"}</span>
          )}
        </Field>
      ) : (
        text("Requisiti", rev.requirements_url, (v) => setRev({ ...rev, requirements_url: v }), () => void saveRevision(), "https://…")
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {text("Stima progettazione (giorni)", rev.design_estimate_days, (v) => setRev({ ...rev, design_estimate_days: v }), () => void saveRevision())}
        {text("Stima implementazione (giorni)", rev.impl_estimate_days, (v) => setRev({ ...rev, impl_estimate_days: v }), () => void saveRevision())}
      </div>

      {error && (
        <p role="alert" className="text-danger text-[13px]">
          {error}
        </p>
      )}
    </section>
  );
}
