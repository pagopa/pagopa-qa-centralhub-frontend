"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import { useTlRunLinks } from "@/hooks/useTestLifecycle";

/** Sotto il report di una run: le feature del Test Lifecycle i cui scenari sono stati eseguiti. */
export function TlRunLinks({ runId }: { runId: string }) {
  const { can } = usePermissions();
  const allowed = can("view:test_lifecycle");
  const { data } = useTlRunLinks(runId, allowed);
  if (!allowed || !data?.length) return null;

  const byFeature = new Map<string, { code: string; tags: Set<string> }>();
  for (const link of data) {
    const entry = byFeature.get(link.feature_id) ?? { code: link.feature_code, tags: new Set<string>() };
    entry.tags.add(link.scenario_tag);
    byFeature.set(link.feature_id, entry);
  }
  return (
    <section aria-label="Feature collegate" className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-text">Feature collegate</h2>
      <ul className="flex flex-col gap-1 text-[13px]">
        {[...byFeature.entries()].map(([id, { code, tags }]) => (
          <li key={id} className="flex items-baseline gap-3">
            <Link href={`/test-lifecycle/${id}`} className="font-mono text-[var(--accent)] hover:underline">{code}</Link>
            <span className="text-text-muted">{tags.size === 1 ? "1 scenario" : `${tags.size} scenari`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
