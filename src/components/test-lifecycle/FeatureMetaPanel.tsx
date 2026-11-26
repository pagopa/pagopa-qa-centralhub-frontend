"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import { useCreateTlJiraTask, useUpdateTlFeature } from "@/hooks/useTestLifecycle";
import { useDraftSave } from "@/hooks/useDraftSave";
import { useUsers } from "@/hooks/useUsers";
import { useStoredFlag } from "@/lib/stored-flag";
import { parseJiraIssueKey } from "@/utils/jiraIssue";
import { PersonChip } from "./PersonChip";
import {
  JIRA_CATEGORY_COLOR,
  JIRA_CATEGORY_LABEL,
  safeHttpUrl,
  TEST_TYPES,
  writeErrorMessage,
  type RegisterFlush,
} from "@/lib/test-lifecycle";
import type { TlFeatureDetail, TlFeatureUpdate, TlJiraLink, TlRevision, TlRevisionUpdate, TlTestType } from "@/types/test-lifecycle";

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
    <label title={title} className="flex flex-col gap-1 font-mono text-[11px] uppercase text-text-dim min-w-0">
      <span className="truncate">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <h3
        className="flex items-center gap-2 font-mono text-[11px] uppercase font-medium text-text-dim"
        style={{ letterSpacing: ".08em" }}
      >
        <span aria-hidden="true" className="size-[7px] rounded-[2px]" style={{ background: "var(--area-violet)" }} />
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
  const createTask = useCreateTlJiraTask();
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
  const [open, setOpen] = useStoredFlag("qa-hub-tl-meta-open", true);
  const contentId = useId();

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

  // A design task created while the panel is mounted (button here or Jira tab): show its key, so the
  // empty local value is never read as an unsaved "clear" and sent on blur or Ctrl+S.
  const [seenDesignKey, setSeenDesignKey] = useState(feature.jira_design_key);
  if (seenDesignKey !== feature.jira_design_key) {
    setSeenDesignKey(feature.jira_design_key);
    if (jira.jira_design_key === "" && feature.jira_design_key) {
      setJira({ ...jira, jira_design_key: feature.jira_design_key });
    }
  }

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
      const known = users?.items.find((u) => u.id === value)?.name;
      return (
        <Field label={label}>
          {known ? (
            <PersonChip name={known} />
          ) : (
            <span className="text-[14px] text-text">{value ? "—" : "Nessuno"}</span>
          )}
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
    opts: { title?: string; jiraKey?: boolean; normalizeKey?: boolean; extra?: ReactNode } = {},
  ) => {
    const extra = opts.extra;
    const link = opts.jiraKey ? feature.jira.find((l) => l.key === value.trim().toUpperCase()) : undefined;
    return (
      <div className="flex flex-col gap-1.5 min-w-0">
        <Field label={label} title={opts.title}>
          <input
            className={INPUT_CLASS}
            value={value}
            readOnly={readOnly}
            placeholder={readOnly ? undefined : placeholder}
            onChange={(e) => {
              // A pasted Jira URL (or a lower-case key) becomes the bare upper-case key.
              const raw = e.target.value;
              onChange(opts.jiraKey || opts.normalizeKey ? (parseJiraIssueKey(raw) ?? raw) : raw);
            }}
            onBlur={onBlur}
          />
        </Field>
        {extra}
        {link && <JiraChip link={link} />}
      </div>
    );
  };

  // Link shown read-only: taken from the saved revision, never from what is being typed.
  const savedRequirementsUrl = revision?.requirements_url ?? "";
  const requirementsUrl = safeHttpUrl(savedRequirementsUrl);
  // An empty title is never sent (the backend requires one): flag it until fixed.
  const titleMissing = !readOnly && !rev.title.trim();

  // A change to an implemented feature needs its own design task: create it on request or type one.
  const needsDesignTask = !readOnly && revision?.status === "draft" && !feature.jira_design_key && !jira.jira_design_key.trim();
  const designHint = needsDesignTask ? (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="text-[13px] text-[var(--accent)] hover:underline disabled:opacity-60"
        disabled={createTask.isPending}
        onClick={() => {
          setError(null);
          createTask
            .mutateAsync({ featureId: feature.id, kind: "design" })
            .catch((err: unknown) => setError(writeErrorMessage(err)));
        }}
      >
        Crea task
      </button>
      {(revision?.number ?? 1) > 1 && (
        <span className="text-[12px] text-text-dim">Questa revisione richiede un nuovo task di progettazione</span>
      )}
    </div>
  ) : null;

  const nameOf = (id: string | null) => users?.items.find((u) => u.id === id)?.name ?? null;
  const designOwner = nameOf(feature.design_owner_id);
  const reviewer = nameOf(feature.reviewer_id);
  const jiraKeys = [feature.jira_design_key, feature.jira_impl_key].filter((k): k is string => Boolean(k));

  return (
    <section className={`flex flex-col gap-3 p-4 ${CARD_CLASS}`}>
      <div className="flex min-w-0 items-center gap-4">
        <h2 className="shrink-0 text-sm font-semibold text-text">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen(!open)}
            className="-mx-1 flex items-center gap-2 rounded-[var(--radius-sm)] px-1 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? "" : "-rotate-90"}`} />
            Metadati
          </button>
        </h2>
        {!open && (
          <div data-testid="meta-summary" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <span className="max-w-[32ch] truncate font-medium text-text">{rev.title.trim() || "—"}</span>
            {designOwner && <PersonChip name={designOwner} label="Owner design" />}
            {reviewer && <PersonChip name={reviewer} label="Reviewer" />}
            {jiraKeys.map((key) => {
              const link = feature.jira.find((l) => l.key === key.trim().toUpperCase());
              return link ? (
                <JiraChip key={key} link={link} />
              ) : (
                <span key={key} className="font-mono text-[12px] text-text-dim">{key}</span>
              );
            })}
            {titleMissing && <span className="text-[12px] text-danger">{TITLE_REQUIRED}</span>}
          </div>
        )}
      </div>

      <div id={contentId} hidden={!open} className="flex flex-col gap-3">

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

      <Field label="Test type">
        {readOnly ? (
          <span className="font-mono text-[13px] text-text">
            {feature.test_type ? `@${feature.test_type}` : "Non impostato"}
          </span>
        ) : (
          <select
            className={SELECT_CLASS}
            value={feature.test_type ?? ""}
            onChange={(e) => saveFeature({ test_type: (e.target.value || null) as TlTestType | null })}
          >
            <option value="">Nessuno</option>
            {TEST_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </Field>

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
      <div className="grid gap-3 sm:grid-cols-3">
        {text(
          "Jira progettazione",
          jira.jira_design_key,
          (v) => setJira({ ...jira, jira_design_key: v }),
          () => {
            if (orNull(jira.jira_design_key) !== feature.jira_design_key) saveFeature({ jira_design_key: orNull(jira.jira_design_key) });
          },
          "PQ-123",
          { jiraKey: true, extra: designHint },
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
        {rev.reverse_engineering ? (
          <Field label="Epic/Story prodotto">
            <span className="text-[14px] text-text-muted">Reverse engineering</span>
          </Field>
        ) : (
          text("Epic/Story prodotto", rev.product_issue_key, (v) => setRev({ ...rev, product_issue_key: v }), saveRevision, "ABC-123", { normalizeKey: true })
        )}
        {text("Stima progettazione (giorni)", rev.design_estimate_days, (v) => setRev({ ...rev, design_estimate_days: v }), saveRevision)}
        {text("Stima implementazione (giorni)", rev.impl_estimate_days, (v) => setRev({ ...rev, impl_estimate_days: v }), saveRevision)}
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

      </Section>

      </div>

      {(error || revisionError) && (
        <p role="alert" className="text-danger text-[13px]">
          {error ?? revisionError}
        </p>
      )}
    </section>
  );
}
