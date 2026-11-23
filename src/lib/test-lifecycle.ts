import { ApiError } from "@/lib/api";
import type {
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
  running: "In esecuzione",
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
};

function errorDetail(err: unknown): Record<string, unknown> | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body as { detail?: unknown } | null | undefined;
  const detail = body?.detail;
  return detail && typeof detail === "object" && !Array.isArray(detail)
    ? (detail as Record<string, unknown>)
    : null;
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

/** Mirror of the backend ALLOWED_EXTRA_TAGS (app/services/test_lifecycle/gherkin.py). */
export const ALLOWED_EXTRA_TAGS = ["runnable", "e2e", "ui", "skip"] as const;

export const STALE_LOCK_MESSAGE =
  "La bozza è stata modificata da un altro utente. Ricarica per vedere le modifiche.";

/** The URL itself when it is an http(s) link, otherwise null (render as plain text). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && /^https?:\/\//i.test(v) ? v : null;
}

/** A pending-edit flusher: saves its dirty draft and resolves to false if that failed. */
export type Flusher = () => Promise<boolean>;

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
  "tl.feature.updated": "Feature aggiornata",
  "tl.revision.submitted": "Revisione inviata in review",
  "tl.revision.approved": "Revisione approvata",
  "tl.revision.changes_requested": "Modifiche richieste",
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
