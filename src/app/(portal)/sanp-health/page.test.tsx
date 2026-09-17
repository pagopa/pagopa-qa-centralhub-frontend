import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SanpHealthLayout from "./layout";
import SanpHealthPage from "./page";
import type {
  SanpHealthMatrixCell,
  SanpHealthMatrixRow,
  SanpHealthReportDetail,
  SanpHealthRun,
} from "@/types/index";

const hooks = vi.hoisted(() => ({
  reports: vi.fn(),
  latest: vi.fn(),
  report: vi.fn(),
  syncStatus: vi.fn(),
  sync: vi.fn(),
}));

const permissions = vi.hoisted(() => ({ allowSync: true }));

vi.mock("@/hooks/useSanpHealth", () => ({
  useSanpHealthReports: hooks.reports,
  useLatestSanpHealthReport: hooks.latest,
  useSanpHealthReport: hooks.report,
  useSanpHealthSyncStatus: hooks.syncStatus,
  useSyncSanpHealth: hooks.sync,
}));

vi.mock("@/components/sanp-health/SanpHealthMatrix", () => ({
  SanpHealthMatrix: ({ rows }: { rows: SanpHealthMatrixRow[] }) => (
    <div data-testid="sanp-health-matrix">Matrix rows: {rows.map((row) => row.spec_name).join(", ")}</div>
  ),
}));

vi.mock("@/lib/permissions", () => ({
  Gate: ({ action, children }: { action: string; children: ReactNode }) => (
    permissions.allowSync ? <div data-action={action}>{children}</div> : null
  ),
}));

vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ action, children }: { action: string; children: ReactNode }) => (
    <div data-testid="route-guard" data-action={action}>{children}</div>
  ),
}));

function makeCell(environment: SanpHealthMatrixCell["environment"]): SanpHealthMatrixCell {
  return {
    id: `${environment}-result`,
    environment,
    status: environment === "SANP" ? "KO" : environment === "COLLAUDO" ? "WARNING" : "INFO",
    source_branch: environment === "SANP" ? "SANP 3.13.0" : null,
    target_apim: `apim-${environment.toLowerCase()}`,
    display_name: "Payments API",
    description: "Payment processing API",
    error_count: environment === "SANP" ? 2 : 0,
    warning_count: environment === "COLLAUDO" ? 3 : 0,
    info_count: environment === "PRODUZIONE" ? 4 : 0,
    changes: [],
  };
}

const row: SanpHealthMatrixRow = {
  spec_name: "payments.yaml",
  display_name: "Payments API",
  description: "Payment processing API",
  sanp: makeCell("SANP"),
  collaudo: makeCell("COLLAUDO"),
  produzione: makeCell("PRODUZIONE"),
};

function makeRun(overrides: Partial<SanpHealthRun> = {}): SanpHealthRun {
  return {
    id: "complete-run",
    github_run_id: 66901,
    run_number: 101,
    head_sha: "abcdef123456",
    workflow_branch: "master",
    conclusion: "success",
    html_url: "https://github.com/pagopa/pagopa-api/actions/runs/66901",
    started_at: "2026-09-16T10:25:00Z",
    completed_at: "2026-09-16T10:30:00Z",
    synced_at: "2026-09-16T10:35:00Z",
    import_status: "complete",
    error_message: null,
    error_count: 2,
    warning_count: 3,
    info_count: 4,
    ...overrides,
  };
}

const completeDetail: SanpHealthReportDetail = {
  report: makeRun(),
  sanp_version: "3.13.0",
  items: [row],
};

const partialDetail: SanpHealthReportDetail = {
  report: makeRun({
    id: "partial-run",
    github_run_id: 66902,
    run_number: 102,
    completed_at: "2026-09-16T11:30:00Z",
    html_url: "https://github.com/pagopa/pagopa-api/actions/runs/66902",
    import_status: "partial",
    error_message: "Artifact PROD non valido",
  }),
  sanp_version: "3.14.0",
  items: [row],
};

const failedDetail: SanpHealthReportDetail = {
  report: makeRun({
    id: "failed-run",
    github_run_id: 66903,
    run_number: 103,
    completed_at: "2026-09-16T12:30:00Z",
    html_url: "https://github.com/pagopa/pagopa-api/actions/runs/66903",
    import_status: "failed",
    error_message: "Artifact SANP non disponibile",
  }),
  sanp_version: null,
  items: [],
};

function queryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, error: null, ...overrides };
}

describe("SANP Health page", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    permissions.allowSync = true;
    hooks.reports.mockReturnValue(queryResult({ items: [partialDetail.report, completeDetail.report] }));
    hooks.latest.mockReturnValue(queryResult({
      report: completeDetail,
      is_stale: false,
      stale_reason: null,
    }));
    hooks.report.mockImplementation((runId: string | null) => queryResult(
      runId === partialDetail.report.id ? partialDetail : undefined,
    ));
    hooks.syncStatus.mockReturnValue(queryResult({
      last_attempt_at: "2026-09-16T10:35:00Z",
      last_success_at: "2026-09-16T10:35:00Z",
      last_error: null,
      imported_run_count: 1,
    }));
    hooks.sync.mockReturnValue({ mutate, isPending: false, isError: false, error: null });
  });

  it("defaults to the latest complete run and renders report metadata", () => {
    render(<SanpHealthPage />);

    expect(screen.getByRole("heading", { name: "SANP Health" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Report" })).toHaveValue("complete-run");
    expect(screen.getByText(/16\/09\/2026/)).toBeInTheDocument();
    expect(screen.getByText("SANP 3.13.0")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /GitHub/i })).toHaveAttribute(
      "href",
      completeDetail.report.html_url,
    );
  });

  it("lists retained runs and loads a historical partial report", async () => {
    const user = userEvent.setup();
    render(<SanpHealthPage />);

    const selector = screen.getByRole("combobox", { name: "Report" });
    expect(selector).toHaveTextContent("Run #102");
    expect(selector).toHaveTextContent("Run #101");

    await user.selectOptions(selector, "partial-run");

    expect(hooks.report).toHaveBeenLastCalledWith("partial-run");
    expect(screen.getByText("SANP 3.14.0")).toBeInTheDocument();
    expect(screen.getByText("Report incompleto")).toBeInTheDocument();
    expect(screen.getByText("Artifact PROD non valido")).toBeInTheDocument();
  });

  it("renders calculated KPI and the selected report matrix", () => {
    render(<SanpHealthPage />);

    expect(screen.getByText("API monitorate").parentElement).toHaveTextContent("1");
    expect(screen.getByText("API con errori").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Errori").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Warning").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Info").parentElement).toHaveTextContent("4");
    expect(screen.getByTestId("sanp-health-matrix")).toHaveTextContent("payments.yaml");
  });

  it("shows stale data details without hiding the latest complete report", () => {
    hooks.latest.mockReturnValue(queryResult({
      report: completeDetail,
      is_stale: true,
      stale_reason: "GitHub non raggiungibile",
    }));
    hooks.syncStatus.mockReturnValue(queryResult({
      last_attempt_at: "2026-09-16T12:00:00Z",
      last_success_at: "2026-09-16T10:35:00Z",
      last_error: "GitHub non raggiungibile",
      imported_run_count: 0,
    }));

    render(<SanpHealthPage />);

    expect(screen.getByText("Dati non aggiornati")).toBeInTheDocument();
    expect(screen.getByText(/GitHub non raggiungibile/)).toBeInTheDocument();
    expect(screen.getByText(/Ultimo aggiornamento riuscito/)).toBeInTheDocument();
    expect(screen.getByTestId("sanp-health-matrix")).toBeInTheDocument();
  });

  it("shows the sync-status error when no report is available", () => {
    hooks.latest.mockReturnValue(queryResult({ report: null, is_stale: false, stale_reason: null }));
    hooks.syncStatus.mockReturnValue(queryResult({
      last_attempt_at: "2026-09-16T12:00:00Z",
      last_success_at: null,
      last_error: "GitHub non raggiungibile",
      imported_run_count: 0,
    }));

    render(<SanpHealthPage />);

    expect(screen.getByText("Dati non aggiornati")).toBeInTheDocument();
    expect(screen.getByText("GitHub non raggiungibile")).toBeInTheDocument();
    expect(screen.getByText("Nessun report SANP Health disponibile")).toBeInTheDocument();
  });

  it("shows a failed synchronization error", () => {
    hooks.sync.mockReturnValue({
      mutate,
      isPending: false,
      isError: true,
      error: new Error("Sincronizzazione GitHub fallita"),
    });

    render(<SanpHealthPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Sincronizzazione GitHub fallita");
  });

  it("shows a dedicated unavailable banner for a failed report", async () => {
    const user = userEvent.setup();
    hooks.reports.mockReturnValue(queryResult({
      items: [failedDetail.report, partialDetail.report, completeDetail.report],
    }));
    hooks.report.mockImplementation((runId: string | null) => queryResult(
      runId === failedDetail.report.id ? failedDetail : partialDetail,
    ));
    render(<SanpHealthPage />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Report" }), "failed-run");

    expect(screen.getByText("Report non disponibile")).toBeInTheDocument();
    expect(screen.getByText("Artifact SANP non disponibile")).toBeInTheDocument();
    expect(screen.queryByText("Report incompleto")).not.toBeInTheDocument();
  });

  it("resets a removed historical selection to the latest available report", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SanpHealthPage />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Report" }), "partial-run");
    expect(screen.getByText("SANP 3.14.0")).toBeInTheDocument();

    hooks.reports.mockReturnValue(queryResult({ items: [completeDetail.report] }));
    hooks.report.mockImplementation((runId: string | null) => queryResult(
      undefined,
      runId === partialDetail.report.id
        ? { isError: true, error: new Error("Report non trovato") }
        : {},
    ));
    rerender(<SanpHealthPage />);

    expect(screen.getByRole("combobox", { name: "Report" })).toHaveValue("complete-run");
    expect(screen.queryByText("Report non trovato")).not.toBeInTheDocument();
    expect(screen.getByText("SANP 3.13.0")).toBeInTheDocument();
  });

  it("renders loading, no-data and fatal-error states", () => {
    hooks.latest.mockReturnValue(queryResult(undefined, { isLoading: true }));
    const { rerender } = render(<SanpHealthPage />);
    expect(screen.getByText("Caricamento SANP Health…")).toBeInTheDocument();

    hooks.latest.mockReturnValue(queryResult({ report: null, is_stale: false, stale_reason: null }));
    rerender(<SanpHealthPage />);
    expect(screen.getByText("Nessun report SANP Health disponibile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sincronizza ora" })).toBeInTheDocument();

    hooks.latest.mockReturnValue(queryResult(undefined, {
      isError: true,
      error: new Error("Backend non disponibile"),
    }));
    rerender(<SanpHealthPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Backend non disponibile");
  });

  it("gates and triggers manual synchronization", () => {
    const { rerender } = render(<SanpHealthPage />);
    const syncButton = screen.getByRole("button", { name: "Sincronizza ora" });
    expect(syncButton.closest("[data-action]")).toHaveAttribute("data-action", "sync:trigger");

    fireEvent.click(syncButton);
    expect(mutate).toHaveBeenCalledOnce();

    permissions.allowSync = false;
    rerender(<SanpHealthPage />);
    expect(screen.queryByRole("button", { name: "Sincronizza ora" })).not.toBeInTheDocument();
  });
});

describe("SANP Health layout", () => {
  it("protects the route with the SANP Health view permission", () => {
    render(<SanpHealthLayout><span>Protected content</span></SanpHealthLayout>);

    expect(screen.getByTestId("route-guard")).toHaveAttribute("data-action", "view:sanp_health");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});