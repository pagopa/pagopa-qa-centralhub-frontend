import { Landmark, Search, WalletMinimal, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Area, StatusFilter } from "@/types/release-status";

const FILTER_CHIPS: { value: StatusFilter; label: string; tone: string }[] = [
  { value: "all", label: "Tutti", tone: "border-accent/40 bg-accent-soft text-accent" },
  { value: "drift", label: "Con versioni diverse", tone: "border-warning/40 bg-warning-soft text-warning" },
  { value: "unreachable", label: "Non raggiungibili", tone: "border-danger/40 bg-danger-soft text-danger" },
  { value: "untested", label: "Non testati", tone: "border-info/40 bg-info-soft text-info" },
];

interface ReleaseToolbarProps {
  area: Area;
  /** Matches of the active filter per area; null when no filter is active. */
  areaMatches?: Record<Area, number> | null;
  query: string;
  filter: StatusFilter;
  onAreaChange: (area: Area) => void;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: StatusFilter) => void;
}

function MatchCount({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} risultati`}
      className="ml-0.5 rounded-full bg-neutral-soft px-1.5 font-mono text-[10px] font-medium tabular-nums text-text-dim"
    >
      {count}
    </span>
  );
}

export function ReleaseToolbar({
  area,
  areaMatches = null,
  query,
  filter,
  onAreaChange,
  onQueryChange,
  onFilterChange,
}: ReleaseToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={area} onValueChange={(value) => onAreaChange(value as Area)}>
          <TabsList className="h-9 bg-subtle">
            <TabsTrigger value="CORE" className="px-3">
              <WalletMinimal aria-hidden="true" />
              Core
              {areaMatches && <MatchCount count={areaMatches.CORE} />}
            </TabsTrigger>
            <TabsTrigger value="TOUCHPOINT" className="px-3">
              <Landmark aria-hidden="true" />
              TouchPoint
              {areaMatches && <MatchCount count={areaMatches.TOUCHPOINT} />}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <label className="relative flex w-full items-center sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 size-4 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Cerca applicazione"
            placeholder="Applicazione, prodotto, repository…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Cancella ricerca"
              onClick={() => onQueryChange("")}
              className="absolute right-2 rounded p-0.5 text-text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <div role="group" aria-label="Filtra per stato" className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = chip.value === filter;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(chip.value)}
              className={`h-7 rounded-full border px-3 text-xs font-medium transition-colors ${
                active ? chip.tone : "border-border bg-surface text-text-dim hover:bg-hover hover:text-text"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
