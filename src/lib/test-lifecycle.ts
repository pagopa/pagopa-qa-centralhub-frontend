import { ApiError } from "@/lib/api";
import type {
  TlBlockedFeature,
  TlBranchSyncState,
  TlFeatureStatus,
  TlJiraCategory,
  TlNrtStatus,
  TlIssueKind,
  TlIssueStatus,
  TlPrState,
  TlRevisionStatus,
  TlTransitionAction,
  TransitionCheck,
} from "@/types/test-lifecycle";

export const FEATURE_STATUS_LABEL: Record<TlFeatureStatus, string> = {
  draft: "Bozza",
  in_review: "In review",
  designed: "Progettata",
  implemented: "Implementata",
  running: "In esecuzione NRT",
};

export const FEATURE_STATUS_COLOR: Record<TlFeatureStatus, { color: string; bg: string }> = {
  draft: { color: "var(--text-muted)", bg: "var(--neutral-soft)" },
  in_review: { color: "var(--warning)", bg: "var(--warning-soft)" },
  designed: { color: "var(--info)", bg: "var(--info-soft)" },
  implemented: { color: "var(--accent)", bg: "var(--accent-soft)" },
  running: { color: "var(--success)", bg: "var(--success-soft)" },
};

export const JIRA_CATEGORY_LABEL: Record<TlJiraCategory, string> = {
  new: "Da fare",
  indeterminate: "In corso",
  done: "Fatto",
};

export const JIRA_CATEGORY_COLOR: Record<TlJiraCategory | "unverified", { color: string; bg: string }> = {
  new: { color: "var(--text-muted)", bg: "var(--neutral-soft)" },
  indeterminate: { color: "var(--info)", bg: "var(--info-soft)" },
  done: { color: "var(--success)", bg: "var(--success-soft)" },
  unverified: { color: "var(--warning)", bg: "var(--warning-soft)" },
};

export const NRT_STATUS_LABEL: Record<TlNrtStatus, string> = {
  PASSED: "Passato",
  FAILED: "Fallito",
  BROKEN: "Rotto",
  SKIPPED: "Saltato",
};

export const NRT_STATUS_COLOR: Record<TlNrtStatus, { color: string; bg: string }> = {
  PASSED: { color: "var(--success)", bg: "var(--success-soft)" },
  FAILED: { color: "var(--danger)", bg: "var(--danger-soft)" },
  BROKEN: { color: "var(--warning)", bg: "var(--warning-soft)" },
  SKIPPED: { color: "var(--text-muted)", bg: "var(--neutral-soft)" },
};

/** Percentuale intera ("67%") o null senza dati. */
export function formatRate(rate: number | null | undefined): string | null {
  return rate == null ? null : `${Math.round(rate * 100)}%`;
}

export const REVISION_STATUS_LABEL: Record<TlRevisionStatus, string> = {
  draft: "Bozza",
  in_review: "In review",
  approved: "Approvata",
  merged: "Integrata",
  superseded: "Sostituita",
};

export const ISSUE_KIND_LABEL: Record<TlIssueKind, string> = {
  structural_change: "Modifica strutturale",
  new_scenario_from_git: "Nuovo scenario da Git",
  file_deleted: "File eliminato",
  unknown_feature_code: "Codice feature sconosciuto",
  parse_error: "File non leggibile",
  pr_closed_unmerged: "PR chiusa senza merge",
  pr_creation_failed: "Creazione PR fallita",
  jira_creation_failed: "Creazione task Jira fallita",
};

export const ISSUE_STATUS_LABEL: Record<TlIssueStatus, string> = {
  open: "Aperta",
  acknowledged: "Presa visione",
  resolved: "Risolta",
};

export const PR_STATE_LABEL: Record<TlPrState, string> = {
  open: "Aperta",
  merged: "Integrata",
  closed: "Chiusa senza merge",
};

export const TRANSITION_LABEL: Record<TlTransitionAction, string> = {
  submit: "Invia in review",
  approve: "Approva",
  request_changes: "Richiedi modifiche",
  reopen: "Riapri",
  withdraw_approval: "Riporta in review",
  withdraw: "Ritira in bozza",
};

function errorDetail(err: unknown): Record<string, unknown> | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body as { detail?: unknown } | null | undefined;
  const detail = body?.detail;
  return detail && typeof detail === "object" && !Array.isArray(detail)
    ? (detail as Record<string, unknown>)
    : null;
}

/** The features that block an adaptation (`adapt_blocked` / `scope_code_blocked`), else empty. */
export function apiErrorBlocked(err: unknown): TlBlockedFeature[] {
  const detail = errorDetail(err);
  if (detail?.code !== "adapt_blocked" && detail?.code !== "scope_code_blocked") return [];
  const list = Array.isArray(detail.blocked) ? detail.blocked : [];
  return list.flatMap((b): TlBlockedFeature[] => {
    if (!b || typeof b !== "object") return [];
    const { feature_id, code, reasons } = b as Record<string, unknown>;
    return typeof feature_id === "string" && typeof code === "string" && Array.isArray(reasons)
      ? [{ feature_id, code, reasons: reasons.filter((r): r is string => typeof r === "string") }]
      : [];
  });
}

/** The backend error `detail.code` of an ApiError, or null. */
export function apiErrorCode(err: unknown): string | null {
  const code = errorDetail(err)?.code;
  return typeof code === "string" ? code : null;
}

/** The backend error `detail.message` of an ApiError, or null. */
export function apiErrorMessage(err: unknown): string | null {
  const message = errorDetail(err)?.message;
  return typeof message === "string" ? message : null;
}

/** The backend error `detail.reasons` of an ApiError (empty when absent). */
export function apiErrorReasons(err: unknown): string[] {
  const reasons = errorDetail(err)?.reasons;
  return Array.isArray(reasons) ? reasons.filter((r): r is string => typeof r === "string") : [];
}

/** True only for a 409 whose detail.code is "stale_lock" (optimistic lock conflict). */
export function isStaleLockError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && apiErrorCode(err) === "stale_lock";
}

/** Reasons why `action` is blocked; empty when allowed or unknown. */
export function transitionBlockReasons(
  checks: TransitionCheck[] | null | undefined,
  action: TlTransitionAction,
): string[] {
  const check = checks?.find((c) => c.action === action);
  return check && !check.allowed ? check.reasons : [];
}

// ── Tag standard (mirror of backend app/services/test_lifecycle/tags.py) ────────

export const TEST_TYPES = ["integration", "e2e", "api"] as const;
export type TestType = (typeof TEST_TYPES)[number];
export const STATUS_TAGS = ["runnable", "skip", "broken"] as const;
export type StatusTag = (typeof STATUS_TAGS)[number];
export const FLAKY_TAG = "flaky";
const POLARITY_TAG_NAMES = ["positive", "negative", "positivo", "negativo"] as const;
/** Names with a dedicated control: never accepted as custom tags. */
export const RESERVED_TAGS: readonly string[] = [...STATUS_TAGS, FLAKY_TAG, ...POLARITY_TAG_NAMES, ...TEST_TYPES];

const CUSTOM_TAG_RE = /^[A-Za-z][A-Za-z0-9_-]{0,49}$/;

/** Replaces the status in place (first status position), drops other status tags, appends if none. */
export function setStatusTag(tags: string[], status: StatusTag): string[] {
  const isStatus = (t: string) => (STATUS_TAGS as readonly string[]).includes(t);
  const first = tags.findIndex(isStatus);
  if (first === -1) return [...tags, status];
  return tags.flatMap((t, i) => (i === first ? [status] : isStatus(t) ? [] : [t]));
}

export function toggleFlaky(tags: string[]): string[] {
  return tags.includes(FLAKY_TAG) ? tags.filter((t) => t !== FLAKY_TAG) : [...tags, FLAKY_TAG];
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag);
}

/** Adds a custom tag after the existing ones; `error` (Italian) explains a refusal and leaves the tags as they were. */
export function addCustomTag(tags: string[], raw: string): { tags: string[]; error?: string } {
  const name = raw.trim().replace(/^@+/, "");
  if (!name) return { tags, error: "Scrivi il nome del tag" };
  if (RESERVED_TAGS.includes(name)) {
    return { tags, error: `@${name} è un tag riservato: usa il controllo dedicato` };
  }
  if (!CUSTOM_TAG_RE.test(name)) {
    return { tags, error: "Tag non valido: lettere, numeri, _ e -, iniziando con una lettera (max 50)" };
  }
  return tags.includes(name) ? { tags } : { tags: [...tags, name] };
}

/** Test type implied by a scope's repository folder (`src/<type>/…`), if any. */
export function defaultTestType(repoFolder: string | null | undefined): TestType | null {
  const parts = (repoFolder ?? "").trim().replace(/^\/+|\/+$/g, "").split("/");
  const type = parts[0] === "src" ? parts[1] : undefined;
  return (TEST_TYPES as readonly string[]).includes(type ?? "") ? (type as TestType) : null;
}

// ── Working branch sync ─────────────────────────────────────────────────────────

export const BRANCH_SYNC_STATES = [
  "no_branch",
  "branch_missing",
  "file_missing",
  "in_sync",
  "hub_ahead",
  "repo_ahead",
  "diverged",
  "unreachable",
  "not_configured",
] as const satisfies readonly TlBranchSyncState[];

export const BRANCH_SYNC_LABEL: Record<TlBranchSyncState, string> = {
  no_branch: "Nessun branch di lavoro",
  branch_missing: "Branch da creare",
  file_missing: "File non ancora sul branch",
  in_sync: "Allineato al repo",
  hub_ahead: "Non ancora sul repo",
  repo_ahead: "Il repo è cambiato",
  diverged: "Hub e repo sono cambiati",
  unreachable: "Repo non raggiungibile",
  not_configured: "Git non configurato",
};

/** The repository changed since the last sync: the person must accept it or overwrite it. */
export function needsDecision(state: TlBranchSyncState): boolean {
  return state === "repo_ahead" || state === "diverged";
}

export const STALE_LOCK_MESSAGE =
  "La bozza è stata modificata da un altro utente. Ricarica per vedere le modifiche.";

/** The URL itself when it is an http(s) link, otherwise null (render as plain text). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && /^https?:\/\//i.test(v) ? v : null;
}

/** A pending-edit flusher: saves its dirty draft and resolves to false if that failed. */
export type Flusher = () => Promise<boolean>;

/** Registers a flusher (and optionally a dirty checker) with the revision writer; returns the unregister fn. */
export type RegisterFlush = (fn: Flusher, isDirty?: () => boolean) => () => void;

/** What the header shows about saving: in flight, failed (until the next success) or last success time. */
export interface TlSaveState {
  phase: "idle" | "saving" | "error";
  savedAt: number | null;
  error: string | null;
}

/** Rejection used once the draft is known to be stale: no write leaves the client. */
export class StaleDraftError extends Error {
  constructor() {
    super("stale_draft");
  }
}

/** First message of a FastAPI/pydantic 422 (`detail` is an array of {msg}), or null. */
export function validationErrorMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  const detail = (err.body as { detail?: unknown } | null | undefined)?.detail;
  if (!Array.isArray(detail)) return null;
  const msg = (detail[0] as { msg?: unknown } | undefined)?.msg;
  return typeof msg === "string" ? msg.replace(/^Value error, /, "") : null;
}

/** Italian user-facing message for a failed write. */
export function writeErrorMessage(err: unknown): string {
  if (apiErrorCode(err) === "revision_locked") {
    return "La revisione non è più in bozza: ricarica la pagina.";
  }
  return (
    apiErrorMessage(err) ??
    validationErrorMessage(err) ??
    (apiErrorReasons(err).join(" ") || "Salvataggio non riuscito.")
  );
}

export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

/** Line-by-line LCS diff, O(n·m). Deletions precede additions within a changed block. */
export function lineDiff(a: string, b: string): DiffLine[] {
  const x = a === "" ? [] : a.split("\n");
  const y = b === "" ? [] : b.split("\n");
  const n = x.length;
  const m = y.length;
  // lcs[i][j] = LCS length of x[i..] and y[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      out.push({ type: "same", text: x[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "del", text: x[i++] });
    } else {
      out.push({ type: "add", text: y[j++] });
    }
  }
  while (i < n) out.push({ type: "del", text: x[i++] });
  while (j < m) out.push({ type: "add", text: y[j++] });
  return out;
}

const EVENT_LABEL: Record<string, string> = {
  "tl.feature.created": "Feature creata",
  "tl.feature.moved": "Feature spostata in un altro ambito",
  "tl.feature.updated": "Feature aggiornata",
  "tl.revision.submitted": "Revisione inviata in review",
  "tl.revision.approved": "Revisione approvata",
  "tl.revision.changes_requested": "Modifiche richieste",
  "tl.revision.approval_withdrawn": "Approvazione ritirata",
  "tl.revision.withdrawn": "Revisione ritirata in bozza",
  "tl.comment.added": "Commento aggiunto",
  "tl.comment.resolved": "Commento risolto",
  "tl.comment.reopened": "Commento riaperto",
  "tl.pr.created": "PR aperta",
  "tl.pr.updated": "PR aggiornata",
  "tl.pr.merged": "PR integrata",
  "tl.pr.closed": "PR chiusa senza merge",
  "tl.git.imported": "File importato da Git",
  "tl.revision.reopened": "Feature riaperta",
  "tl.revision.rebased": "Bozza riallineata",
  "tl.revision.stale": "Bozza superata da Git",
  "tl.issue.updated": "Anomalia aggiornata",
  "tl.feature.implemented": "Feature implementata",
  "tl.jira.task_created": "Task Jira creato",
  "tl.jira.task_linked": "Task Jira collegato",
  "tl.jira.refreshed": "Stato Jira aggiornato",
  "tl.feature.running": "Feature in esecuzione (prima run NRT)",
  "tl.feature.migrated": "Feature migrata da Confluence",
  "tl.feature.aligned": "File allineato allo standard QA Hub",
  "tl.feature.imported": "Scenari importati da Git",
};

/** Italian label for a history event action; unknown actions fall back to the raw key. */
export function tlEventLabel(action: string | null | undefined): string {
  if (!action) return "Evento";
  return Object.hasOwn(EVENT_LABEL, action) ? EVENT_LABEL[action] : action;
}
