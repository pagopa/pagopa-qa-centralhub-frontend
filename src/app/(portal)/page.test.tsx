import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OverviewPage from "./page";

const mocks = vi.hoisted(() => ({
  can: vi.fn((action: string) => Boolean(action)),
  features: vi.fn(),
  jira: vi.fn(),
  passRate: vi.fn(),
  pending: vi.fn(),
  gpd: vi.fn(),
  summary: vi.fn(),
}));

vi.mock("@/components/auth/RouteGuard", () => ({ RouteGuard: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can, isLoading: false }) }));
vi.mock("@/hooks/useFeatureVisibility", () => ({ useFeatureVisibility: mocks.features }));
vi.mock("@/hooks/useJira", () => ({ useJiraOverview: mocks.jira }));
vi.mock("@/hooks/useNrts", () => ({ useNrtsAvgPassRate: mocks.passRate, usePendingRuns: mocks.pending }));
vi.mock("@/hooks/useReleaseStatus", () => ({ useReleaseSummary: mocks.summary }));
vi.mock("@/hooks/useGpdPositions", () => ({ useGpdPositionSnapshots: mocks.gpd }));

const FEATURES = [
  "ea_map", "docs", "jira", "api_docs", "qg_nrts", "nrts", "flaky_scenarios", "tas_nrts", "bdd",
  "dq_catalog", "gpd_positions", "psp_fees",
];

function setFeatures(disabled: string[] = []) {
  mocks.features.mockReturnValue({
    isLoading: false,
    isError: false,
    data: { items: FEATURES.map((key) => ({ key, enabled: !disabled.includes(key) })) },
  });
}

function pillar(name: string) {
  return within(screen.getByRole("region", { name }));
}

function sectionNames(name: string) {
  return pillar(name)
    .getAllByRole("link")
    .filter((link) => link.hasAttribute("data-section"))
    .map((link) => link.getAttribute("data-section"));
}

function kpi(name: string, label: string) {
  const match = pillar(name)
    .getAllByRole("link")
    .find((link) => link.hasAttribute("data-kpi") && link.textContent?.startsWith(label));
  if (!match) throw new Error(`Missing KPI ${label} in ${name}`);
  return match;
}

beforeEach(() => {
  mocks.can.mockImplementation((action: string) => Boolean(action));
  setFeatures();
  mocks.jira.mockReturnValue({ isLoading: false, data: { total: 183, by_status: [{ name: "BLOCKED", count: 2 }] } });
  mocks.passRate.mockReturnValue({ isLoading: false, data: 85 });
  mocks.pending.mockReturnValue({ isLoading: false, data: { total: 7, nrt: 5, qg: 2 } });
  mocks.summary.mockReturnValue({ isLoading: false, data: { total: 53, aligned: 41, drift: 7, unreachable: 3, untested: 0, under_qa: 2, last_success_at: null } });
  mocks.gpd.mockReturnValue({ isLoading: false, data: { items: [{ total: 368_741_000 }, { total: 374_271_713 }] } });
});

describe("OverviewPage", () => {
  it("organises the page in the three pillars", () => {
    render(<OverviewPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Centro di Competenza QA" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Testing" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Data Quality" })).toBeInTheDocument();
  });

  it("puts each section in its pillar, in order", () => {
    render(<OverviewPage />);
    expect(sectionNames("Centro di Competenza QA")).toEqual(["/ea-map", "/docs", "/jira", "/api-docs"]);
    expect(sectionNames("Testing")).toEqual(["/quality-gate", "/nrts", "/flaky-scenarios", "/tas-nrts", "/bdd"]);
    expect(sectionNames("Data Quality")).toEqual(["/data-quality/catalog", "/data-hub/gpd-positions", "/data-hub/psp-fees"]);
  });

  it("hides sections the user cannot open or whose feature is disabled", () => {
    mocks.can.mockImplementation((action: string) => action !== "view:bdd");
    setFeatures(["psp_fees"]);
    render(<OverviewPage />);
    expect(sectionNames("Testing")).not.toContain("/bdd");
    expect(sectionNames("Data Quality")).not.toContain("/data-hub/psp-fees");
  });

  it("shows the active Jira issues in the competence centre pillar", () => {
    render(<OverviewPage />);
    const issues = kpi("Centro di Competenza QA", "Issue attive");
    expect(issues).toHaveAttribute("href", "/jira");
    expect(issues).toHaveTextContent("183");
    expect(issues).toHaveTextContent("2 bloccate");
  });

  it("shows the NRT pass rate and the runs to analyse in the testing pillar", () => {
    render(<OverviewPage />);
    expect(kpi("Testing", "Pass rate medio NRT")).toHaveTextContent("85%");
    const pending = kpi("Testing", "Run da analizzare");
    expect(pending).toHaveTextContent("7");
    expect(pending).toHaveTextContent("NRT 5");
    expect(pending).toHaveTextContent("QG 2");
    expect(pending).toHaveAttribute("href", "/nrts");
  });

  it("links the runs to analyse to the Quality Gate when only QG runs are pending", () => {
    mocks.pending.mockReturnValue({ isLoading: false, data: { total: 2, nrt: 0, qg: 2 } });
    render(<OverviewPage />);
    expect(kpi("Testing", "Run da analizzare")).toHaveAttribute("href", "/quality-gate");
  });

  it("shows the GPD positions with their change in the data quality pillar", () => {
    render(<OverviewPage />);
    const gpd = kpi("Data Quality", "Posizioni Debitorie GPD");
    expect(gpd).toHaveTextContent("374.271.713");
    expect(gpd).toHaveTextContent("+1,5%");
  });

  it("shows dashes while indicators are loading", () => {
    mocks.pending.mockReturnValue({ isLoading: true, data: undefined });
    mocks.passRate.mockReturnValue({ isLoading: false, data: undefined });
    render(<OverviewPage />);
    expect(pillar("Testing").getByText("Run da analizzare").closest("[data-kpi]")).toHaveTextContent("—");
    expect(pillar("Testing").getByText("Pass rate medio NRT").closest("[data-kpi]")).toHaveTextContent("—");
  });

  it("shows the aligned releases with deep links to the filtered list", () => {
    render(<OverviewPage />);
    const tile = kpi("Testing", "Release allineate");
    expect(tile).toHaveTextContent("41/53");
    expect(tile).toHaveAttribute("href", "/releases");
    const testing = pillar("Testing");
    expect(testing.getByRole("link", { name: "7 con versioni diverse" })).toHaveAttribute("href", "/releases?filter=drift");
    expect(testing.getByRole("link", { name: "3 non raggiungibili" })).toHaveAttribute("href", "/releases?filter=unreachable");
    expect(testing.getByRole("link", { name: "2 sotto test QA" })).toHaveAttribute("href", "/releases?filter=under_qa");
    expect(tile.querySelector("a")).toBeNull();
  });

  it("shows a dash for the release status while loading", () => {
    mocks.summary.mockReturnValue({ isLoading: true, data: undefined });
    render(<OverviewPage />);
    expect(kpi("Testing", "Release allineate")).toHaveTextContent("—");
  });

  it("hides the release status KPI without view:status_page", () => {
    mocks.can.mockImplementation((action: string) => action !== "view:status_page");
    mocks.summary.mockClear();
    render(<OverviewPage />);
    expect(pillar("Testing").queryByText("Release allineate")).not.toBeInTheDocument();
    expect(mocks.summary).not.toHaveBeenCalled();
  });
});
