"use client";

import { Search } from "lucide-react";
import { INPUT_CLASS, SELECT_CLASS } from "@/components/ui/formStyles";
import type { FlakyEnv, FlakyFilters as Filters, FlakyFlagFilter } from "@/types/flaky";

const ENVIRONMENTS: FlakyEnv[] = ["DEV", "UAT", "PROD"];
const FLAGS: Array<{ value: FlakyFlagFilter; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "flagged", label: "Marcati flaky" },
  { value: "unflagged", label: "Non marcati" },
];
const LEVELS = [1, 2, 3, 4, 5];

export function FlakyFilters({
  value,
  onChange,
  suites,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  suites: string[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Ambiente
        <select
          className={SELECT_CLASS}
          value={value.env}
          onChange={(event) => onChange({ ...value, env: event.target.value as FlakyEnv })}
        >
          {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Suite
        <select
          className={SELECT_CLASS}
          value={value.testObjects[0] ?? ""}
          onChange={(event) => onChange({ ...value, testObjects: event.target.value ? [event.target.value] : [] })}
        >
          <option value="">Tutte</option>
          {suites.map((suite) => <option key={suite} value={suite}>{suite}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Flag
        <select
          className={SELECT_CLASS}
          value={value.flag}
          onChange={(event) => onChange({ ...value, flag: event.target.value as FlakyFlagFilter })}
        >
          {FLAGS.map((flag) => <option key={flag.value} value={flag.value}>{flag.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-dim">
        Livello minimo
        <select
          className={SELECT_CLASS}
          value={value.minLevel ?? ""}
          onChange={(event) => onChange({ ...value, minLevel: event.target.value ? Number(event.target.value) : null })}
        >
          <option value="">Qualsiasi</option>
          {LEVELS.map((level) => <option key={level} value={level}>≥ {level}</option>)}
        </select>
      </label>
      <label className="relative flex min-w-52 flex-1 flex-col gap-1 text-xs text-text-dim">
        Cerca scenario
        <span className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            className={`${INPUT_CLASS} w-full pl-8`}
            value={value.q}
            placeholder="Nome dello scenario"
            onChange={(event) => onChange({ ...value, q: event.target.value })}
          />
        </span>
      </label>
    </div>
  );
}
