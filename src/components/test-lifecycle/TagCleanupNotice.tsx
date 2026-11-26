"use client";

import { useState } from "react";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/formStyles";
import { useApplyTlTagCleanup, useTlTagCleanup } from "@/hooks/useTestLifecycle";
import { writeErrorMessage } from "@/lib/test-lifecycle";

/**
 * Proposes to move the test-type tags (`@e2e`, `@integration`, `@api`) found on scenarios to the
 * file's test type. Pending edits are saved first, then the cleanup runs and the page reloads.
 */
export function TagCleanupNotice({
  featureId,
  editable,
  afterPendingWrites,
  onApplied,
}: {
  featureId: string;
  editable: boolean;
  afterPendingWrites: <T>(fn: () => Promise<T>) => Promise<T>;
  onApplied: () => void;
}) {
  const { data } = useTlTagCleanup(featureId);
  const apply = useApplyTlTagCleanup();
  const [error, setError] = useState<string | null>(null);

  if (!editable || !data || data.rows.length === 0) return null;

  const names = [...new Set(data.rows.flatMap((r) => r.tags))].map((t) => `@${t}`);
  const run = async () => {
    setError(null);
    try {
      await afterPendingWrites(() => apply.mutateAsync(featureId));
      onApplied();
    } catch (err) {
      setError(writeErrorMessage(err));
    }
  };

  return (
    <div
      role="region"
      aria-label="Pulizia dei tag di test-type"
      className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-subtle p-3 text-[13px] text-text"
    >
      <p>
        {data.rows.length} {data.rows.length === 1 ? "scenario ha" : "scenari hanno"} tag di test-type (
        {names.join(", ")}): il test-type appartiene al file.
        {data.proposed_test_type && (
          <>
            {" "}
            Si propone di toglierli dagli scenari e di impostare <strong>@{data.proposed_test_type}</strong> sul file.
          </>
        )}
      </p>
      {data.conflict && <p style={{ color: "var(--danger)" }}>{data.conflict}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          disabled={!!data.conflict || apply.isPending}
          onClick={() => void run()}
        >
          Applica pulizia
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
