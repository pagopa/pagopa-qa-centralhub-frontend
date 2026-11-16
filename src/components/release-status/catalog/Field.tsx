import { useId, type ReactElement, cloneElement } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}

/** Label + control + inline error. The control gets the id, aria-invalid and aria-describedby wired. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const hasMessage = Boolean(error || hint);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": hasMessage ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Extracts the backend `{detail, field}` body of a 409/404 error, when present. */
export function errorParts(error: unknown): { status: number | null; detail: string | null; field: string | null } {
  const status =
    typeof error === "object" && error !== null && "status" in error ? Number((error as { status: unknown }).status) : null;
  const body = typeof error === "object" && error !== null && "body" in error ? (error as { body: unknown }).body : null;
  const detail = (body as { detail?: unknown } | null)?.detail;
  const field = (body as { field?: unknown } | null)?.field;
  return {
    status,
    detail: typeof detail === "string" && detail ? detail : null,
    field: typeof field === "string" && field ? field : null,
  };
}
