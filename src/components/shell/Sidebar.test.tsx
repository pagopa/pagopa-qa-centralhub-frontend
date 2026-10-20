import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  ["nrt_metrics", "NRT Metrics", "/nrt-metrics", "view:nrt_metrics", false],
  ["psp_fees", "PSP Commissioni", "/data-hub/psp-fees", "view:data_hub", false],
  ["gpd_positions", "Posizioni Debitorie GPD", "/data-hub/gpd-positions", "view:data_hub", false],
  ["dq_catalog", "Catalogo Controlli", "/data-quality/catalog", "view:data_quality", false],
  ["dq_domains", "Controlli per Dominio", "/data-quality/domains", "view:data_quality", false],
  ["settings_e2e", "Settings E2E", "/settings/integrations", "manage:integrations", false],
  ["settings_gherkin", "Settings Gherkin", "/settings/bdd", "manage:bdd", false],
  ["ea_map", "EA Map", "/ea-map", "view:ea_map", false],
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
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubEnv("NEXT_PUBLIC_NRT_METRICS_URL", "https://grafana.example.com/d/nrt?orgId=1&kiosk");
    mocks.can.mockImplementation((action: string) => Boolean(action));
    mocks.apiClient.mockReset();
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: key !== "nrt_metrics",
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("opens NRT Metrics directly in a new tab with an external-link indicator", async () => {
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key, label, route, action, external, enabled: true,
      })),
    });
    renderSidebar();

    const link = await screen.findByRole("link", { name: "NRT Metrics" });
    expect(link).toHaveAttribute("href", "https://grafana.example.com/d/nrt?orgId=1&kiosk");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "NRT Metrics (si apre in una nuova scheda)");
    expect(link.querySelector(".lucide-external-link")).toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((item) => item.textContent?.trim());
    expect(labels.indexOf("NRT Metrics")).toBe(labels.indexOf("SANP Health") + 1);
  });

  it.each([undefined, "", "   "])(
    "uses the original Grafana dashboard as default for %s",
    async (url) => {
      vi.stubEnv("NEXT_PUBLIC_NRT_METRICS_URL", url);
      mocks.apiClient.mockResolvedValue({
        items: featureItems.map(([key, label, route, action, external]) => ({
          key, label, route, action, external, enabled: true,
        })),
      });
      renderSidebar();

      const link = await screen.findByRole("link", { name: "NRT Metrics" });
      expect(link).toHaveAttribute(
        "href",
        "https://pagopa-u-weu-grafana-cpavbjb0axhrdcg3.weu.grafana.azure.com/d/an5bhhc/qa-nrt-metrics?orgId=1&from=now-30d&to=now&timezone=browser&var-test_object=checkout&var-test_object=wisp&var-test_object=fdr3&editIndex=0&tab=transformations&kiosk",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    },
  );

  it.each(["not-a-url", "javascript:alert(1)"])(
    "disables NRT Metrics and explains invalid configuration for %s",
    async (url) => {
      vi.stubEnv("NEXT_PUBLIC_NRT_METRICS_URL", url);
      mocks.apiClient.mockResolvedValue({
        items: featureItems.map(([key, label, route, action, external]) => ({
          key, label, route, action, external, enabled: true,
        })),
      });
      renderSidebar();

      const item = await screen.findByText("NRT Metrics");
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).toHaveAttribute("title", expect.stringContaining("NEXT_PUBLIC_NRT_METRICS_URL"));
      expect(screen.queryByRole("link", { name: "NRT Metrics" })).not.toBeInTheDocument();
    },
  );

  it("lists the architecture map right after the overview", async () => {
    renderSidebar();

    expect(await screen.findByRole("link", { name: "EA Map" })).toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((link) => link.textContent?.trim());
    expect(labels.indexOf("EA Map")).toBe(labels.indexOf("Overview") + 1);
  });

  it("hides disabled pages while preserving enabled navigation items", async () => {
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "NRT Metrics" })).not.toBeInTheDocument();
  });

  it("continues to hide pages denied by RBAC even when their toggle is enabled", async () => {
    mocks.can.mockImplementation((action) => action !== "view:nrt_metrics");
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
    expect(screen.queryByRole("link", { name: "NRT Metrics" })).not.toBeInTheDocument();
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

  it("collapses to an icon rail and keeps accessible link names", async () => {
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key, label, route, action, external, enabled: true,
      })),
    });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Riduci menu" }));

    expect(document.documentElement.getAttribute("data-sidebar")).toBe("collapsed");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("title", "Overview");
    const nrtLink = screen.getByRole("link", { name: "NRT Metrics" });
    expect(nrtLink).toHaveAttribute("target", "_blank");
    expect(nrtLink).toHaveAttribute("title", "NRT Metrics (si apre in una nuova scheda)");
    expect(nrtLink.querySelector(".lucide-external-link")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Espandi menu" }));
    expect(document.documentElement.hasAttribute("data-sidebar")).toBe(false);
  });
});
