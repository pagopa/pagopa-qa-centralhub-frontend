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
