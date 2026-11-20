import { ApiError } from "@/lib/api";
import type {
  TlFeatureStatus,
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

export const REVISION_STATUS_LABEL: Record<TlRevisionStatus, string> = {
  draft: "Bozza",
  in_review: "In review",
  approved: "Approvata",
  merged: "Integrata",
  superseded: "Sostituita",
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
