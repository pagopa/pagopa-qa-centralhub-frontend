import { describe, expect, it } from "vitest";
import {
  calculateSanpHealthKpis,
  filterSanpHealthRows,
  formatSanpVersion,
  selectPrimaryDescription,
} from "@/lib/sanp-health";
import type {
  SanpEnvironment,
  SanpHealthMatrixCell,
  SanpHealthMatrixRow,
  SanpResultStatus,
} from "@/types/index";

function makeCell(
  environment: SanpEnvironment,
  status: SanpResultStatus,
  overrides: Partial<SanpHealthMatrixCell> = {},
): SanpHealthMatrixCell {
  return {
    id: `${environment.toLowerCase()}-id`,
    environment,
    status,
    source_branch: null,
    target_apim: null,
    display_name: null,
    description: null,
    error_count: 0,
    warning_count: 0,
    info_count: 0,
    changes: [],
    ...overrides,
  };
}

const rows: SanpHealthMatrixRow[] = [
  {
    spec_name: "payments.yaml",
    display_name: "Payments API",
    description: "Production payments",
    sanp: makeCell("SANP", "KO", {
      display_name: "Payments SANP",
      description: "SANP payments",
      error_count: 2,
    }),
    collaudo: makeCell("COLLAUDO", "WARNING", {
      display_name: "Payments UAT",
      description: "UAT payments",
      warning_count: 1,
    }),
    produzione: makeCell("PRODUZIONE", "OK", {
      display_name: "Payments PROD",
      description: "Production payments",
    }),
  },
  {
    spec_name: "wallet.yaml",
    display_name: "Wallet API",
    description: "Digital wallet",
    sanp: makeCell("SANP", "NOT_CONFIGURED", { id: null }),
    collaudo: makeCell("COLLAUDO", "INFO", {
      display_name: "Wallet UAT",
      description: "Digital wallet",
      info_count: 2,
    }),
    produzione: makeCell("PRODUZIONE", "KO", {
      display_name: "Wallet PROD",
      description: "Production wallet",
      error_count: 1,
      warning_count: 1,
    }),
  },
];

describe("selectPrimaryDescription", () => {
  it("prefers Produzione, then Collaudo, then SANP", () => {
    expect(selectPrimaryDescription(rows[0])).toEqual({
      displayName: "Payments PROD",
      description: "Production payments",
    });

    const withoutProduzione = {
      ...rows[0],
      produzione: makeCell("PRODUZIONE", "NOT_CONFIGURED", { id: null }),
    };
    expect(selectPrimaryDescription(withoutProduzione).displayName).toBe("Payments UAT");

    const onlySanp = {
      ...withoutProduzione,
      collaudo: makeCell("COLLAUDO", "NOT_CONFIGURED", { id: null }),
    };
    expect(selectPrimaryDescription(onlySanp).displayName).toBe("Payments SANP");
  });
});

describe("calculateSanpHealthKpis", () => {
  it("aggregates monitored APIs, failing APIs and severity totals", () => {
    expect(calculateSanpHealthKpis(rows)).toEqual({
      monitoredApis: 2,
      apisWithErrors: 2,
      errors: 3,
      warnings: 2,
      info: 2,
    });
  });
});

describe("filterSanpHealthRows", () => {
  it("searches spec name, display name and description case-insensitively", () => {
    expect(filterSanpHealthRows(rows, { search: "WALLET", environment: "ALL", status: "ALL" }))
      .toEqual([rows[1]]);
    expect(filterSanpHealthRows(rows, { search: "production payments", environment: "ALL", status: "ALL" }))
      .toEqual([rows[0]]);
  });

  it("combines environment and status filters", () => {
    expect(filterSanpHealthRows(rows, { search: "", environment: "SANP", status: "KO" }))
      .toEqual([rows[0]]);
    expect(filterSanpHealthRows(rows, { search: "", environment: "ALL", status: "NOT_CONFIGURED" }))
      .toEqual([rows[1]]);
  });
});

describe("formatSanpVersion", () => {
  it("extracts a dotted SANP version from its source branch", () => {
    expect(formatSanpVersion("release / SANP   3.13.0 candidate")).toBe("3.13.0");
  });

  it("returns null when the branch has no SANP version", () => {
    expect(formatSanpVersion("develop")).toBeNull();
    expect(formatSanpVersion(null)).toBeNull();
  });
});