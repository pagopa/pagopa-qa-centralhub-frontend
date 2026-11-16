"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, SearchX } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplicationDetailSheet } from "@/components/release-status/ApplicationDetailSheet";
import { ProductGroup } from "@/components/release-status/ProductGroup";
import { ReleaseHeader } from "@/components/release-status/ReleaseHeader";
import { ReleaseKpis } from "@/components/release-status/ReleaseKpis";
import { ReleaseToolbar } from "@/components/release-status/ReleaseToolbar";
import { useReleaseStatus, useReleaseSyncStatus, useTriggerReleaseSync } from "@/hooks/useReleaseStatus";
import { filterApplications, filterParams, parseFilterParams, type FilterState } from "@/lib/release-status";
import type { AreaGroup } from "@/types/release-status";

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
}

function sortAreas(areas: AreaGroup[]): AreaGroup[] {
  return areas.map((area) => ({
    ...area,
    products: [...area.products]
      .map((product) => ({ ...product, applications: [...product.applications].sort(byName) }))
      .sort(byName),
  }));
}

function Bar({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded bg-subtle ${className}`} />;
}

function ReleasesSkeleton() {
  return (
    <div role="status" aria-label="Caricamento release" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Bar className="h-6 w-44" />
        <Bar className="h-3 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Bar key={i} className="h-[86px] rounded-[var(--radius)]" />
        ))}
      </div>
      {Array.from({ length: 2 }, (_, group) => (
        <div key={group} className="rounded-[var(--radius)] border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <Bar className="h-4 w-40" />
          </div>
          {Array.from({ length: 3 }, (_, row) => (
            <div
              key={row}
              className="grid grid-cols-2 gap-4 border-t border-border px-4 py-3.5 first:border-t-0 sm:grid-cols-[minmax(15rem,1.6fr)_repeat(4,minmax(0,1fr))]"
            >
              <Bar className="col-span-2 h-4 w-48 sm:col-span-1" />
              {Array.from({ length: 4 }, (_, cell) => (
                <Bar key={cell} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReleasesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<FilterState>(() => parseFilterParams(new URLSearchParams(searchParams.toString())));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statusQuery = useReleaseStatus();
  const trigger = useTriggerReleaseSync();
  const syncStatusQuery = useReleaseSyncStatus({ onFinished: trigger.reset });

  const areas = useMemo(() => sortAreas(statusQuery.data?.areas ?? []), [statusQuery.data]);
  const areaApplications = useMemo(
    () =>
      areas
        .filter((group) => group.area === state.area)
        .flatMap((group) => group.products.flatMap((product) => product.applications)),
    [areas, state.area],
  );
  const visible = useMemo(
    () => filterApplications(areas, state.area, state.q, state.filter).flatMap((group) => group.products),
    [areas, state],
  );

  const update = (patch: Partial<FilterState>) => {
    const next = { ...state, ...patch };
    setState(next);
    const query = filterParams(next).toString();
    router.replace(query ? `/releases?${query}` : "/releases", { scroll: false });
  };

  if (statusQuery.isLoading) return <ReleasesSkeleton />;

  if (statusQuery.error) {
    const message = statusQuery.error instanceof Error ? statusQuery.error.message : "";
    return (
      <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        Impossibile caricare lo stato delle release{message && ` (${message})`}
      </div>
    );
  }

  const sync = syncStatusQuery.data !== undefined ? syncStatusQuery.data : (statusQuery.data?.sync ?? null);
  const syncRunning = sync?.in_progress === true;

  return (
    <TooltipProvider>
      <div className="flex min-w-0 flex-col gap-6">
        <ReleaseHeader
          sync={sync}
          syncInProgress={trigger.isPending || syncRunning}
          onSync={() => trigger.mutate()}
          syncError={trigger.isError ? trigger.error : null}
        />

        <ReleaseKpis
          applications={areaApplications}
          filter={state.filter}
          onFilterChange={(filter) => update({ filter })}
        />

        <ReleaseToolbar
          area={state.area}
          query={state.q}
          filter={state.filter}
          onAreaChange={(area) => update({ area })}
          onQueryChange={(q) => update({ q })}
          onFilterChange={(filter) => update({ filter })}
        />

        {visible.length > 0 ? (
          <div className="flex flex-col gap-4">
            {visible.map((product) => (
              <ProductGroup key={product.id} product={product} onOpen={setSelectedId} />
            ))}
          </div>
        ) : (
          <div
            role="status"
            aria-label="Nessun risultato"
            className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-dashed border-border bg-surface px-4 py-12 text-center"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-neutral-soft text-text-muted">
              <SearchX className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-text">Nessun risultato</p>
            <p className="text-xs text-text-muted">
              {areaApplications.length === 0
                ? "Nessuna applicazione censita in quest'area."
                : "Prova a cambiare la ricerca o il filtro."}
            </p>
            {(state.q || state.filter !== "all") && (
              <button
                type="button"
                onClick={() => update({ q: "", filter: "all" })}
                className="mt-1 text-xs font-medium text-accent hover:underline"
              >
                Azzera ricerca e filtri
              </button>
            )}
          </div>
        )}
      </div>

      <ApplicationDetailSheet applicationId={selectedId} onClose={() => setSelectedId(null)} />
    </TooltipProvider>
  );
}

export default function ReleasesPage() {
  return (
    <RouteGuard action="view:status_page">
      <Suspense fallback={<ReleasesSkeleton />}>
        <ReleasesView />
      </Suspense>
    </RouteGuard>
  );
}
