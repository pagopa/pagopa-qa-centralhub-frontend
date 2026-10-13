import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  can: vi.fn((action: string) => Boolean(action)),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: mocks.can, role: "superadmin", isLoading: false }),
}));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));

const featureItems = [
  ["overview", "Overview", "/", "view:overview", false],
  ["bdd", "Gherkin Generator", "/bdd", "view:bdd", false],
  ["e2e", "E2E", "/e2e", "view:e2e", false],
  ["sanp_health", "SANP Health", "/sanp-health", "view:sanp_health", false],
  ["jira", "KPI Jira", "/jira", "view:jira", false],
  ["metrics", "Metriche", "/metrics", "view:metrics", false],
  ["psp_fees", "PSP Commissioni", "/data-hub/psp-fees", "view:data_hub", false],
  ["gpd_positions", "Posizioni Debitorie GPD", "/data-hub/gpd-positions", "view:data_hub", false],
  ["dq_catalog", "Catalogo Controlli", "/data-quality/catalog", "view:data_quality", false],
  ["dq_domains", "Controlli per Dominio", "/data-quality/domains", "view:data_quality", false],
  ["settings_e2e", "Settings E2E", "/settings/integrations", "manage:integrations", false],
  ["settings_gherkin", "Settings Gherkin", "/settings/bdd", "manage:bdd", false],
  ["docs", "Docs & Decks", "/docs", "view:docs", false],
  ["api_docs", "API Docs", "/api/v1/docs", "view:api_docs", true],
] as const;

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar />
    </QueryClientProvider>,
  );
}

describe("Sidebar feature visibility", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: key !== "metrics",
      })),
    });
  });

  it("hides disabled pages while preserving enabled navigation items", async () => {
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Metriche" })).not.toBeInTheDocument();
  });

  it("continues to hide pages denied by RBAC even when their toggle is enabled", async () => {
    mocks.can.mockImplementation((action) => action !== "view:metrics");
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: true,
      })),
    });

    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Metriche" })).not.toBeInTheDocument();
  });

  it("hides the external API Docs link when its feature is disabled", async () => {
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: key !== "api_docs",
      })),
    });

    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "API Docs" })).not.toBeInTheDocument();
  });

  it("toggles E2E and Gherkin settings independently", async () => {
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: key !== "settings_e2e",
      })),
    });

    renderSidebar();

    expect(await screen.findByRole("link", { name: "Settings Gherkin" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Settings E2E" })).not.toBeInTheDocument();
  });
});
