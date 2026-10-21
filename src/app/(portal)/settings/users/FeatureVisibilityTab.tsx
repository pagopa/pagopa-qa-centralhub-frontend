"use client";

import { useFeatureVisibility, useUpdateFeatureVisibility } from "@/hooks/useFeatureVisibility";

export function FeatureVisibilityTab() {
  const featuresQuery = useFeatureVisibility();
  const update = useUpdateFeatureVisibility();

  if (featuresQuery.isLoading) {
    return <p className="text-text-muted text-[13px]">Caricamento…</p>;
  }

  if (featuresQuery.isError || !featuresQuery.data) {
    return (
      <p role="alert" className="text-sm text-danger">
        Impossibile caricare la configurazione delle funzionalità.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          Impossibile salvare la visibilità della funzionalità.
        </p>
      )}
      <div className="rounded-[var(--radius)] border border-border overflow-hidden">
        <table aria-label="Visibilità funzionalità" className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-subtle border-b border-border">
              <th className="text-left px-3 py-2 font-medium text-text-muted">Funzionalità</th>
              <th className="text-left px-3 py-2 font-medium text-text-muted">Route</th>
              <th className="text-center px-3 py-2 font-medium text-text-muted">Visibile</th>
            </tr>
          </thead>
          <tbody>
            {featuresQuery.data.items.map((feature) => (
              <tr key={feature.key} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{feature.label}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-dim">{feature.route}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={feature.label}
                    checked={feature.enabled}
                    disabled={update.isPending}
                    onChange={(event) => update.mutate({
                      key: feature.key,
                      enabled: event.target.checked,
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
