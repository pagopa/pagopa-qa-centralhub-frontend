"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SanpHealthFilters } from "@/components/sanp-health/SanpHealthFilters";
import { SanpHealthResultDetails } from "@/components/sanp-health/SanpHealthResultDetails";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  filterSanpHealthRows,
  selectPrimaryDescription,
  type SanpHealthFilters as Filters,
} from "@/lib/sanp-health";
import type { SanpHealthMatrixCell, SanpHealthMatrixRow, SanpResultStatus } from "@/types/index";

interface SanpHealthMatrixProps {
  rows: SanpHealthMatrixRow[];
}

const initialFilters: Filters = {
  search: "",
  environment: "ALL",
  status: "ALL",
};

const statusStyles: Record<SanpResultStatus, string> = {
  KO: "bg-danger-soft text-danger",
  WARNING: "bg-warning-soft text-warning",
  INFO: "bg-info-soft text-info",
  OK: "bg-success-soft text-success",
  NOT_CONFIGURED: "border border-dashed border-border-strong bg-neutral-soft text-text-muted",
};

const environmentColumns = [
  { environment: "SANP", label: "SANP", cell: (row: SanpHealthMatrixRow) => row.sanp },
  { environment: "COLLAUDO", label: "Collaudo", cell: (row: SanpHealthMatrixRow) => row.collaudo },
  { environment: "PRODUZIONE", label: "Produzione", cell: (row: SanpHealthMatrixRow) => row.produzione },
] as const;

function formatCellStatus(cell: SanpHealthMatrixCell): string {
  if (cell.status === "NOT_CONFIGURED") return "Non configurato";

  const counts = [
    cell.error_count > 0 ? `${cell.error_count}E` : null,
    cell.warning_count > 0 ? `${cell.warning_count}W` : null,
    cell.info_count > 0 ? `${cell.info_count}I` : null,
  ].filter(Boolean);

  return counts.length > 0 ? `${cell.status} · ${counts.join(" ")}` : cell.status;
}

function StatusCell({ cell }: { cell: SanpHealthMatrixCell }) {
  return (
    <span
      data-status={cell.status}
      className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[cell.status]}`}
    >
      {formatCellStatus(cell)}
    </span>
  );
}

function DescriptionCell({ row }: { row: SanpHealthMatrixRow }) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const description = selectPrimaryDescription(row);

  return (
    <td className="px-4 py-3">
      <p className="font-medium text-text">{description.displayName}</p>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger
          render={(
            <button
              type="button"
              aria-label={`Descrizione completa: ${description.description}`}
              className="mt-0.5 line-clamp-2 cursor-help rounded-sm text-left text-xs text-text-dim outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onPointerEnter={() => setTooltipOpen(true)}
              onPointerLeave={() => setTooltipOpen(false)}
              onFocus={() => setTooltipOpen(true)}
              onBlur={() => setTooltipOpen(false)}
            >
              {description.description}
            </button>
          )}
        />
        <TooltipContent aria-hidden="true">{description.description}</TooltipContent>
      </Tooltip>
    </td>
  );
}

export function SanpHealthMatrix({ rows }: SanpHealthMatrixProps) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const visibleRows = filterSanpHealthRows(rows, filters);
  const visibleColumns = filters.environment === "ALL"
    ? environmentColumns
    : environmentColumns.filter((column) => column.environment === filters.environment);
  const allExpanded = visibleRows.length > 0
    && visibleRows.every((row) => expandedRows.has(row.spec_name));

  const toggleRow = (specName: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(specName)) next.delete(specName);
      else next.add(specName);
      return next;
    });
  };

  const toggleAll = () => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (allExpanded) {
        visibleRows.forEach((row) => next.delete(row.spec_name));
        return next;
      }
      visibleRows.forEach((row) => next.add(row.spec_name));
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <SanpHealthFilters
        filters={filters}
        allExpanded={allExpanded}
        onChange={setFilters}
        onToggleAll={toggleAll}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <TooltipProvider>
          <table aria-label="Matrice SANP Health" className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-subtle">
                <th scope="col" className="w-[22%] px-4 py-2 text-left font-medium text-text-muted">API Spec</th>
                <th scope="col" className="w-[30%] px-4 py-2 text-left font-medium text-text-muted">API Desc</th>
                {visibleColumns.map((column) => (
                  <th key={column.environment} scope="col" className="w-[16%] px-4 py-2 text-left font-medium text-text-muted">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={2 + visibleColumns.length} className="px-4 py-10 text-center text-text-muted">
                    Nessuna API corrisponde ai filtri
                  </td>
                </tr>
              )}
              {visibleRows.map((row) => {
                const isExpanded = expandedRows.has(row.spec_name);
                const cells = visibleColumns.map((column) => column.cell(row));

                return (
                  <Fragment key={row.spec_name}>
                    <tr className="border-b border-border transition-colors hover:bg-hover">
                      <th scope="row" className="px-4 py-3 text-left font-semibold text-text">
                        <button
                          type="button"
                          aria-label={`${isExpanded ? "Comprimi" : "Espandi"} ${row.spec_name}`}
                          aria-expanded={isExpanded}
                          onClick={() => toggleRow(row.spec_name)}
                          className="flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {isExpanded ? <ChevronDown className="size-4 text-text-muted" /> : <ChevronRight className="size-4 text-text-muted" />}
                          <span className="font-mono text-xs">{row.spec_name}</span>
                        </button>
                      </th>
                      <DescriptionCell row={row} />
                      {cells.map((cell) => (
                        <td key={cell.environment} className="px-4 py-3">
                          <StatusCell cell={cell} />
                        </td>
                      ))}
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border bg-subtle/60">
                        <td colSpan={2 + visibleColumns.length} className="p-0">
                          <SanpHealthResultDetails specName={row.spec_name} cells={cells} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TooltipProvider>
      </div>
    </div>
  );
}