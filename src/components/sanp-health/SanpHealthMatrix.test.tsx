import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SanpHealthMatrix } from "@/components/sanp-health/SanpHealthMatrix";
import type { SanpHealthFilters as FilterValues } from "@/lib/sanp-health";
import type {
  SanpEnvironment,
  SanpHealthMatrixCell,
  SanpHealthMatrixRow,
  SanpResultStatus,
} from "@/types/index";

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ render }: { render: ReactNode }) => render,
  TooltipContent: ({ children }: { children: ReactNode }) => <div role="tooltip">{children}</div>,
}));

vi.mock("@/components/sanp-health/SanpHealthFilters", () => ({
  SanpHealthFilters: ({
    filters,
    allExpanded,
    onChange,
    onToggleAll,
  }: {
    filters: FilterValues;
    allExpanded: boolean;
    onChange: (filters: FilterValues) => void;
    onToggleAll: () => void;
  }) => (
    <div>
      <input
        type="search"
        aria-label="Cerca API"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />
      <select
        aria-label="Ambiente"
        value={filters.environment}
        onChange={(event) => onChange({
          ...filters,
          environment: event.target.value as FilterValues["environment"],
        })}
      >
        <option value="ALL">Tutti gli ambienti</option>
        <option value="SANP">SANP</option>
        <option value="COLLAUDO">Collaudo</option>
        <option value="PRODUZIONE">Produzione</option>
      </select>
      <select
        aria-label="Stato"
        value={filters.status}
        onChange={(event) => onChange({
          ...filters,
          status: event.target.value as FilterValues["status"],
        })}
      >
        <option value="ALL">Tutti gli stati</option>
        <option value="KO">KO</option>
        <option value="WARNING">Warning</option>
        <option value="INFO">Info</option>
        <option value="OK">OK</option>
        <option value="NOT_CONFIGURED">Non configurato</option>
      </select>
      <button type="button" onClick={onToggleAll}>
        {allExpanded ? "Comprimi tutto" : "Espandi tutto"}
      </button>
    </div>
  ),
}));

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
    display_name: "Payments fallback",
    description: "Fallback description",
    sanp: makeCell("SANP", "KO", {
      source_branch: "SANP 3.13.0",
      target_apim: "apim-dev",
      display_name: "Payments SANP",
      description: "SANP description",
      error_count: 1,
      warning_count: 1,
      info_count: 1,
      changes: [
        {
          id: "error-change",
          level: 3,
          severity: "error",
          rule_id: "breaking-response",
          message: "Response schema changed",
          path: "/payments/{id}",
          operation: "GET",
          section: "responses",
          comment: "Restore the required field",
          change_order: 0,
        },
        {
          id: "warning-change",
          level: 2,
          severity: "warning",
          rule_id: "deprecated-operation",
          message: "Operation is deprecated",
          path: "/payments",
          operation: "POST",
          section: "paths",
          comment: null,
          change_order: 1,
        },
        {
          id: "info-change",
          level: 1,
          severity: "info",
          rule_id: "description-updated",
          message: "Description changed",
          path: null,
          operation: null,
          section: "info",
          comment: "Documentation only",
          change_order: 2,
        },
      ],
    }),
    collaudo: makeCell("COLLAUDO", "WARNING", {
      source_branch: "develop",
      target_apim: "apim-uat",
      display_name: "Payments UAT",
      description: "UAT description",
      warning_count: 2,
    }),
    produzione: makeCell("PRODUZIONE", "OK", {
      source_branch: "master",
      target_apim: "apim-prod",
      display_name: "Payments PROD",
      description: "The complete production description used by the API Desc tooltip",
    }),
  },
  {
    spec_name: "wallet.yaml",
    display_name: "Wallet fallback",
    description: "Wallet fallback description",
    sanp: makeCell("SANP", "NOT_CONFIGURED", { id: null }),
    collaudo: makeCell("COLLAUDO", "INFO", {
      display_name: "Wallet UAT",
      description: "Digital wallet in UAT",
      info_count: 2,
    }),
    produzione: makeCell("PRODUZIONE", "KO", {
      display_name: "Wallet PROD",
      description: "Digital wallet in production",
      error_count: 2,
    }),
  },
];

describe("SanpHealthMatrix", () => {
  it("renders semantic columns, compact statuses and a distinct not-configured state", () => {
    render(<SanpHealthMatrix rows={rows} />);

    const table = screen.getByRole("table", { name: "Matrice SANP Health" });
    for (const heading of ["API Spec", "API Desc", "SANP", "Collaudo", "Produzione"]) {
      expect(within(table).getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }

    expect(within(table).getByText("KO · 1E 1W 1I")).toBeInTheDocument();
    expect(within(table).getByText("WARNING · 2W")).toBeInTheDocument();
    expect(within(table).getByText("OK")).toBeInTheDocument();
    expect(within(table).getByText("Non configurato")).toHaveAttribute("data-status", "NOT_CONFIGURED");
    expect(within(table).getByText("OK")).toHaveAttribute("data-status", "OK");
  });

  it("uses production API description priority and exposes the full description in a tooltip", async () => {
    render(<SanpHealthMatrix rows={rows} />);

    expect(screen.getByText("Payments PROD")).toBeInTheDocument();
    expect(screen.queryByText("Payments UAT")).not.toBeInTheDocument();

    const description = screen.getAllByText(
      "The complete production description used by the API Desc tooltip",
    ).find((element) => element.tagName === "SPAN");
    expect(description).not.toHaveAttribute("tabindex");
    expect(screen.getAllByRole("tooltip")[0]).toHaveTextContent(
      "The complete production description used by the API Desc tooltip",
    );
  });

  it("expands a row into environment metadata and severity-grouped change fields", async () => {
    const user = userEvent.setup();
    render(<SanpHealthMatrix rows={rows} />);

    await user.click(screen.getByRole("button", { name: "Espandi payments.yaml" }));

    expect(screen.getByRole("region", { name: "Dettagli payments.yaml" })).toBeInTheDocument();
    expect(screen.getByText("SANP 3.13.0")).toBeInTheDocument();
    expect(screen.getByText("apim-dev")).toBeInTheDocument();
    expect(screen.getByText("Payments SANP")).toBeInTheDocument();
    expect(screen.getByText("SANP description")).toBeInTheDocument();
    expect(screen.getByText("1 errori · 1 warning · 1 info")).toBeInTheDocument();

    for (const group of ["Errori (1)", "Warning (1)", "Info (1)"]) {
      expect(screen.getByRole("heading", { name: group })).toBeInTheDocument();
    }
    for (const value of [
      "breaking-response",
      "GET",
      "/payments/{id}",
      "responses",
      "Response schema changed",
      "Restore the required field",
    ]) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it("expands and collapses every visible row", async () => {
    const user = userEvent.setup();
    render(<SanpHealthMatrix rows={rows} />);

    await user.click(screen.getByRole("button", { name: "Espandi tutto" }));
    expect(screen.getByRole("region", { name: "Dettagli payments.yaml" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Dettagli wallet.yaml" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Comprimi tutto" }));
    expect(screen.queryByRole("region", { name: "Dettagli payments.yaml" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Dettagli wallet.yaml" })).not.toBeInTheDocument();
  });

  it("collapses only visible rows and preserves hidden expansions", async () => {
    const user = userEvent.setup();
    render(<SanpHealthMatrix rows={rows} />);

    await user.click(screen.getByRole("button", { name: "Espandi tutto" }));
    await user.type(screen.getByRole("searchbox", { name: "Cerca API" }), "wallet");
    await user.click(screen.getByRole("button", { name: "Comprimi tutto" }));
    await user.clear(screen.getByRole("searchbox", { name: "Cerca API" }));

    expect(screen.getByRole("region", { name: "Dettagli payments.yaml" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Dettagli wallet.yaml" })).not.toBeInTheDocument();
  });

  it("filters by name, environment and status", async () => {
    const user = userEvent.setup();
    render(<SanpHealthMatrix rows={rows} />);

    await user.type(screen.getByRole("searchbox", { name: "Cerca API" }), "wallet");
    expect(screen.getByText("wallet.yaml")).toBeInTheDocument();
    expect(screen.queryByText("payments.yaml")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Cerca API" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Ambiente" }), { target: { value: "SANP" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Stato" }), { target: { value: "KO" } });

    expect(screen.getByText("payments.yaml")).toBeInTheDocument();
    expect(screen.queryByText("wallet.yaml")).not.toBeInTheDocument();
  });

  it("shows only the selected environment column and applies status within it", () => {
    render(<SanpHealthMatrix rows={rows} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Stato" }), { target: { value: "KO" } });
    expect(screen.getByText("payments.yaml")).toBeInTheDocument();
    expect(screen.getByText("wallet.yaml")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Stato" }), { target: { value: "ALL" } });

    fireEvent.change(screen.getByRole("combobox", { name: "Ambiente" }), {
      target: { value: "COLLAUDO" },
    });

    const table = screen.getByRole("table", { name: "Matrice SANP Health" });
    expect(within(table).getByRole("columnheader", { name: "API Spec" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "API Desc" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Collaudo" })).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "SANP" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Produzione" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Stato" }), { target: { value: "KO" } });
    expect(screen.queryByText("payments.yaml")).not.toBeInTheDocument();
    expect(screen.queryByText("wallet.yaml")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Stato" }), { target: { value: "INFO" } });
    expect(screen.queryByText("payments.yaml")).not.toBeInTheDocument();
    expect(screen.getByText("wallet.yaml")).toBeInTheDocument();
  });
});