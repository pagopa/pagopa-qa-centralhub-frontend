"use client";

import { useState, type ReactNode } from "react";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useUpdateTlFeature } from "@/hooks/useTestLifecycle";
import { useDraftSave } from "@/hooks/useDraftSave";
import { useUsers } from "@/hooks/useUsers";
import { safeHttpUrl, writeErrorMessage, type Flusher } from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlFeatureUpdate, TlRevision, TlRevisionUpdate } from "@/types/test-lifecycle";

type RevisionPatch = Omit<TlRevisionUpdate, "lock_version">;

interface RevisionDraft {
  title: string;
  description: string;
  requirements_url: string;
  product_issue_key: string;
  reverse_engineering: boolean;
  design_estimate_days: string;
  impl_estimate_days: string;
}

function toRevisionDraft(r: TlRevision | null): RevisionDraft {
  return {
    title: r?.title ?? "",
    description: r?.description ?? "",
    requirements_url: r?.requirements_url ?? "",
    product_issue_key: r?.product_issue_key ?? "",
    reverse_engineering: r?.reverse_engineering ?? false,
    design_estimate_days: r?.design_estimate_days ?? "",
    impl_estimate_days: r?.impl_estimate_days ?? "",
  };
}

const orNull = (v: string) => v.trim() || null;

function diffRevision(saved: RevisionDraft, next: RevisionDraft): RevisionPatch {
  const patch: RevisionPatch = {};
  if (next.title !== saved.title && next.title.trim()) patch.title = next.title.trim();
  if (next.description !== saved.description) patch.description = orNull(next.description);
  if (next.requirements_url !== saved.requirements_url) patch.requirements_url = orNull(next.requirements_url);
  if (next.product_issue_key !== saved.product_issue_key) patch.product_issue_key = orNull(next.product_issue_key);
  if (next.reverse_engineering !== saved.reverse_engineering) patch.reverse_engineering = next.reverse_engineering;
  if (next.design_estimate_days !== saved.design_estimate_days) patch.design_estimate_days = orNull(next.design_estimate_days);
  if (next.impl_estimate_days !== saved.impl_estimate_days) patch.impl_estimate_days = orNull(next.impl_estimate_days);
  return patch;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-dim min-w-0">
      {label}
      {children}
    </label>
  );
}

export const TITLE_REQUIRED = "Il titolo è obbligatorio";

/**
 * Feature metadata (owners, Jira keys) and revision metadata (title,
 * requirements, Epic/Story or reverse engineering, estimates). Local values are
 * seeded once; the page remounts the panel on reload.
 *
 * `readOnly` locks everything except the reviewer picker, which follows
 * `reviewerEditable` (the reviewer can be reassigned while the revision is in
 * review). Pickers list only active users.
 */
export function FeatureMetaPanel({
  feature,
  revision,
  readOnly,
  reviewerEditable = !readOnly,
  stale = false,
  onSaveRevision,
  registerFlush,
}: {
  feature: TlFeatureDetail;
  revision: TlRevision | null;
  readOnly: boolean;
  reviewerEditable?: boolean;
  stale?: boolean;
  onSaveRevision: (patch: RevisionPatch) => Promise<unknown>;
  registerFlush?: (fn: Flusher) => () => void;
}) {
  const { data: users } = useUsers();
  const updateFeature = useUpdateTlFeature();
  const {
    draft: rev,
    setDraft: setRev,
    save,
    error: revisionError,
  } = useDraftSave<RevisionDraft, RevisionPatch>({
    initial: toRevisionDraft(revision),
    diff: diffRevision,
    persist: onSaveRevision,
    disabled: readOnly || stale || !revision,
    registerFlush,
  });
  const [jira, setJira] = useState({
    jira_design_key: feature.jira_design_key ?? "",
    jira_impl_key: feature.jira_impl_key ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const activeUsers = users?.items.filter((u) => u.is_active) ?? [];

  const saveFeature = (patch: TlFeatureUpdate, allowed = !readOnly) => {
    if (!allowed) return;
    setError(null);
    updateFeature.mutate({ id: feature.id, ...patch }, { onError: (err) => setError(writeErrorMessage(err)) });
  };

  const saveRevision = () => void save();

  const userSelect = (
    label: string,
    key: "design_owner_id" | "reviewer_id" | "impl_owner_id",
    editable = !readOnly,
  ) => {
    const value = feature[key] ?? "";
    if (!editable) {
      const name = users?.items.find((u) => u.id === value)?.name ?? (value ? "—" : "Nessuno");
      return (
        <Field label={label}>
          <span className="text-[14px] text-text">{name}</span>
        </Field>
      );
    }
    // The reviewer can never be the design owner (the backend rejects it too).
    const options =
      key === "reviewer_id" ? activeUsers.filter((u) => u.id !== feature.design_owner_id) : activeUsers;
    return (
      <Field label={label}>
        <select
          className={SELECT_CLASS}
          value={value}
          onChange={(e) => saveFeature({ [key]: e.target.value || null }, editable)}
        >
          <option value="">Nessuno</option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
          {value && !options.some((u) => u.id === value) && (
            <option value={value} disabled>
              {(users?.items.find((u) => u.id === value)?.name ?? "Utente sconosciuto") + " (non attivo)"}
            </option>
          )}
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
  // An empty title is never sent (the backend requires one): flag it until fixed.
  const titleMissing = !readOnly && !rev.title.trim();

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-text">Metadati</h2>

      <div className="flex flex-col gap-1">
        <Field label="Titolo">
          <input
            className={INPUT_CLASS}
            style={titleMissing ? { borderColor: "var(--danger)" } : undefined}
            value={rev.title}
            readOnly={readOnly}
            aria-invalid={titleMissing || undefined}
            aria-describedby={titleMissing ? "tl-title-error" : undefined}
            onChange={(e) => setRev({ ...rev, title: e.target.value })}
            onBlur={saveRevision}
          />
        </Field>
        {titleMissing && (
          <p id="tl-title-error" className="text-danger text-[12px]">
            {TITLE_REQUIRED}
          </p>
        )}
      </div>

      <Field label="Descrizione">
        <textarea
          className="min-h-20 rounded-[var(--radius-sm)] border border-border-strong bg-surface p-2 text-[14px] text-text outline-none focus:border-accent"
          value={rev.description}
          readOnly={readOnly}
          onChange={(e) => setRev({ ...rev, description: e.target.value })}
          onBlur={saveRevision}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        {userSelect("Owner design", "design_owner_id")}
        {userSelect("Reviewer", "reviewer_id", reviewerEditable)}
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
          text("Epic/Story prodotto", rev.product_issue_key, (v) => setRev({ ...rev, product_issue_key: v }), saveRevision, "ABC-123")
        )}
        <label className="flex items-center gap-2 text-[13px] text-text-dim h-9">
          <input
            type="checkbox"
            checked={rev.reverse_engineering}
            disabled={readOnly}
            onChange={(e) => {
              const next = { ...rev, reverse_engineering: e.target.checked };
              setRev(next);
              saveRevision();
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
        text("Requisiti", rev.requirements_url, (v) => setRev({ ...rev, requirements_url: v }), saveRevision, "https://…")
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {text("Stima progettazione (giorni)", rev.design_estimate_days, (v) => setRev({ ...rev, design_estimate_days: v }), saveRevision)}
        {text("Stima implementazione (giorni)", rev.impl_estimate_days, (v) => setRev({ ...rev, impl_estimate_days: v }), saveRevision)}
      </div>

      {(error || revisionError) && (
        <p role="alert" className="text-danger text-[13px]">
          {error ?? revisionError}
        </p>
      )}
    </section>
  );
}
