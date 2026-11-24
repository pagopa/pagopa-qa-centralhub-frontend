"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useUpdateTlFeature } from "@/hooks/useTestLifecycle";
import { useDraftSave } from "@/hooks/useDraftSave";
import { useUsers } from "@/hooks/useUsers";
import {
  JIRA_CATEGORY_COLOR,
  JIRA_CATEGORY_LABEL,
  safeHttpUrl,
  writeErrorMessage,
  type RegisterFlush,
} from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlFeatureUpdate, TlJiraLink, TlRevision, TlRevisionUpdate } from "@/types/test-lifecycle";

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

function Field({ label, children, title }: { label: string; children: ReactNode; title?: string }) {
  return (
    <label title={title} className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-muted min-w-0">
      {label}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <h3 className="font-mono text-[11px] uppercase font-medium text-text-muted" style={{ letterSpacing: ".08em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Jira status of a linked key (from the saved feature), with a link to the issue. */
function JiraChip({ link }: { link: TlJiraLink }) {
  const category = link.category ?? "unverified";
  const { color, bg } = JIRA_CATEGORY_COLOR[category];
  const url = safeHttpUrl(link.url);
  return (
    <span
      data-testid={`jira-chip-${link.key}`}
      className="inline-flex items-center gap-2 w-fit rounded-full px-2 py-0.5 font-mono text-[11px]"
      style={{ color, background: bg }}
    >
      {link.status ?? (link.category ? JIRA_CATEGORY_LABEL[link.category] : "Non verificata")}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
          {link.key} <ExternalLink size={12} aria-hidden />
        </a>
      )}
    </span>
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
  registerFlush?: RegisterFlush;
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
    jira_qa_epic_key: feature.jira_qa_epic_key ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const activeUsers = users?.items.filter((u) => u.is_active) ?? [];

  // Jira keys are saved on blur through the feature endpoint, outside the revision draft: expose
  // them to the page (Ctrl+S flush, leave warning) as one more dirty/flushable block.
  const pendingJira = (): TlFeatureUpdate => {
    const patch: TlFeatureUpdate = {};
    if (orNull(jira.jira_design_key) !== feature.jira_design_key) patch.jira_design_key = orNull(jira.jira_design_key);
    if (orNull(jira.jira_impl_key) !== feature.jira_impl_key) patch.jira_impl_key = orNull(jira.jira_impl_key);
    if (orNull(jira.jira_qa_epic_key) !== feature.jira_qa_epic_key) patch.jira_qa_epic_key = orNull(jira.jira_qa_epic_key);
    return patch;
  };
  const pendingJiraRef = useRef(pendingJira);
  const updateFeatureRef = useRef(updateFeature);
  useEffect(() => {
    pendingJiraRef.current = pendingJira;
    updateFeatureRef.current = updateFeature;
  });
  useEffect(() => {
    if (!registerFlush || readOnly) return;
    const flush = () =>
      new Promise<boolean>((resolve) => {
        const patch = pendingJiraRef.current();
        if (Object.keys(patch).length === 0) return resolve(true);
        updateFeatureRef.current.mutate(
          { id: feature.id, ...patch },
          {
            onSuccess: () => resolve(true),
            onError: (err) => {
              setError(writeErrorMessage(err));
              resolve(false);
            },
          },
        );
      });
    return registerFlush(flush, () => Object.keys(pendingJiraRef.current()).length > 0);
  }, [registerFlush, readOnly, feature.id]);

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

  const text = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    onBlur: () => void,
    placeholder?: string,
    opts: { title?: string; jiraKey?: boolean } = {},
  ) => {
    const link = opts.jiraKey ? feature.jira.find((l) => l.key === value.trim().toUpperCase()) : undefined;
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <Field label={label} title={opts.title}>
          <input
            className={INPUT_CLASS}
            value={value}
            readOnly={readOnly}
            placeholder={readOnly ? undefined : placeholder}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        </Field>
        {link && <JiraChip link={link} />}
      </div>
    );
  };

  // Link shown read-only: taken from the saved revision, never from what is being typed.
  const savedRequirementsUrl = revision?.requirements_url ?? "";
  const requirementsUrl = safeHttpUrl(savedRequirementsUrl);
  // An empty title is never sent (the backend requires one): flag it until fixed.
  const titleMissing = !readOnly && !rev.title.trim();

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-text">Metadati</h2>

      <Section title="Generale">
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
      </Section>

      <Section title="Persone">
      <div className="grid gap-3 sm:grid-cols-3">
        {userSelect("Owner design", "design_owner_id")}
        {userSelect("Reviewer", "reviewer_id", reviewerEditable)}
        {userSelect("Owner implementazione", "impl_owner_id")}
      </div>
      </Section>

      <Section title="Jira">
      <div className="grid gap-3 sm:grid-cols-2">
        {text(
          "Jira progettazione",
          jira.jira_design_key,
          (v) => setJira({ ...jira, jira_design_key: v }),
          () => {
            if (orNull(jira.jira_design_key) !== feature.jira_design_key) saveFeature({ jira_design_key: orNull(jira.jira_design_key) });
          },
          "PQ-123",
          { jiraKey: true },
        )}
        {text(
          "Jira implementazione",
          jira.jira_impl_key,
          (v) => setJira({ ...jira, jira_impl_key: v }),
          () => {
            if (orNull(jira.jira_impl_key) !== feature.jira_impl_key) saveFeature({ jira_impl_key: orNull(jira.jira_impl_key) });
          },
          undefined,
          { jiraKey: true },
        )}
        {text(
          "Epic QA (sovrascrive quella dell'Ambito)",
          jira.jira_qa_epic_key,
          (v) => setJira({ ...jira, jira_qa_epic_key: v }),
          () => {
            if (orNull(jira.jira_qa_epic_key) !== feature.jira_qa_epic_key) saveFeature({ jira_qa_epic_key: orNull(jira.jira_qa_epic_key) });
          },
          feature.jira_qa_epic_effective ?? "PQ-123",
          { title: "Se compilata, sovrascrive l'Epic QA definita sull'ambito per questa feature", jiraKey: true },
        )}
      </div>
      </Section>

      <Section title="Prodotto e stime">

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
              {savedRequirementsUrl}
            </a>
          ) : (
            <span className="text-[14px] text-text break-all">{savedRequirementsUrl || "—"}</span>
          )}
        </Field>
      ) : (
        text("Requisiti", rev.requirements_url, (v) => setRev({ ...rev, requirements_url: v }), saveRevision, "https://…")
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {text("Stima progettazione (giorni)", rev.design_estimate_days, (v) => setRev({ ...rev, design_estimate_days: v }), saveRevision)}
        {text("Stima implementazione (giorni)", rev.impl_estimate_days, (v) => setRev({ ...rev, impl_estimate_days: v }), saveRevision)}
      </div>
      </Section>

      {(error || revisionError) && (
        <p role="alert" className="text-danger text-[13px]">
          {error ?? revisionError}
        </p>
      )}
    </section>
  );
}
