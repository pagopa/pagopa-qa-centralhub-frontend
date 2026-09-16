"use client";

import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SanpHealthFilters as Filters } from "@/lib/sanp-health";
import type { SanpEnvironment, SanpResultStatus } from "@/types/index";

interface SanpHealthFiltersProps {
  filters: Filters;
  allExpanded: boolean;
  onChange: (filters: Filters) => void;
  onToggleAll: () => void;
}

const environments: Array<{ value: SanpEnvironment | "ALL"; label: string }> = [
  { value: "ALL", label: "Tutti gli ambienti" },
  { value: "SANP", label: "SANP" },
  { value: "COLLAUDO", label: "Collaudo" },
  { value: "PRODUZIONE", label: "Produzione" },
];

const statuses: Array<{ value: SanpResultStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Tutti gli stati" },
  { value: "KO", label: "KO" },
  { value: "WARNING", label: "Warning" },
  { value: "INFO", label: "Info" },
  { value: "OK", label: "OK" },
  { value: "NOT_CONFIGURED", label: "Non configurato" },
];

export function SanpHealthFilters({
  filters,
  allExpanded,
  onChange,
  onToggleAll,
}: SanpHealthFiltersProps) {
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-52 flex-1 sm:max-w-sm">
        <span className="sr-only">Cerca API</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Cerca API"
          className="h-8 w-full rounded-lg border border-border bg-surface py-1.5 pr-3 pl-8 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      <Select
        open={environmentOpen}
        onOpenChange={setEnvironmentOpen}
        value={filters.environment}
        onValueChange={(environment) => onChange({
          ...filters,
          environment: environment as SanpEnvironment | "ALL",
        })}
      >
        <SelectTrigger
          aria-label="Ambiente"
          className="w-44 bg-surface"
          onClick={() => setEnvironmentOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              setEnvironmentOpen(true);
            }
          }}
        >
          <SelectValue>{environments.find((item) => item.value === filters.environment)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-surface text-text">
          {environments.map((environment) => (
            <SelectItem key={environment.value} value={environment.value}>
              {environment.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        open={statusOpen}
        onOpenChange={setStatusOpen}
        value={filters.status}
        onValueChange={(status) => onChange({
          ...filters,
          status: status as SanpResultStatus | "ALL",
        })}
      >
        <SelectTrigger
          aria-label="Stato"
          className="w-40 bg-surface"
          onClick={() => setStatusOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              setStatusOpen(true);
            }
          }}
        >
          <SelectValue>{statuses.find((item) => item.value === filters.status)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-surface text-text">
          {statuses.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" size="sm" onClick={onToggleAll} className="sm:ml-auto">
        {allExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
        {allExpanded ? "Comprimi tutto" : "Espandi tutto"}
      </Button>
    </div>
  );
}