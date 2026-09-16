import type {
  SanpEnvironment,
  SanpHealthMatrixCell,
  SanpHealthMatrixRow,
  SanpResultStatus,
} from "@/types/index";

export interface SanpHealthDescription {
  displayName: string;
  description: string;
}

export interface SanpHealthKpis {
  monitoredApis: number;
  apisWithErrors: number;
  errors: number;
  warnings: number;
  info: number;
}

export interface SanpHealthFilters {
  search: string;
  environment: SanpEnvironment | "ALL";
  status: SanpResultStatus | "ALL";
}

const cells = (row: SanpHealthMatrixRow): SanpHealthMatrixCell[] => [
  row.sanp,
  row.collaudo,
  row.produzione,
];

export function selectPrimaryDescription(row: SanpHealthMatrixRow): SanpHealthDescription {
  const primaryCell = [row.produzione, row.collaudo, row.sanp].find(
    (cell) => cell.status !== "NOT_CONFIGURED",
  );

  return {
    displayName: primaryCell?.display_name ?? row.display_name,
    description: primaryCell?.description ?? row.description,
  };
}

export function calculateSanpHealthKpis(rows: SanpHealthMatrixRow[]): SanpHealthKpis {
  return rows.reduce<SanpHealthKpis>(
    (totals, row) => {
      const rowCells = cells(row);
      totals.monitoredApis += 1;
      totals.apisWithErrors += rowCells.some((cell) => cell.error_count > 0) ? 1 : 0;
      totals.errors += rowCells.reduce((sum, cell) => sum + cell.error_count, 0);
      totals.warnings += rowCells.reduce((sum, cell) => sum + cell.warning_count, 0);
      totals.info += rowCells.reduce((sum, cell) => sum + cell.info_count, 0);
      return totals;
    },
    { monitoredApis: 0, apisWithErrors: 0, errors: 0, warnings: 0, info: 0 },
  );
}

export function filterSanpHealthRows(
  rows: SanpHealthMatrixRow[],
  filters: SanpHealthFilters,
): SanpHealthMatrixRow[] {
  const search = filters.search.trim().toLocaleLowerCase();

  return rows.filter((row) => {
    const rowCells = cells(row);
    const matchesSearch = !search || [
      row.spec_name,
      row.display_name,
      row.description,
      ...rowCells.flatMap((cell) => [cell.display_name, cell.description]),
    ].some((value) => value?.toLocaleLowerCase().includes(search));

    const statusCells = filters.environment === "ALL"
      ? rowCells
      : rowCells.filter((cell) => cell.environment === filters.environment);
    const matchesStatus = filters.status === "ALL"
      || statusCells.some((cell) => cell.status === filters.status);

    return matchesSearch && matchesStatus;
  });
}

export function formatSanpVersion(sourceBranch: string | null): string | null {
  return sourceBranch?.match(/SANP\s*([0-9]+(?:\.[0-9]+)*)/i)?.[1] ?? null;
}