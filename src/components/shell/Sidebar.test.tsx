import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  can: vi.fn((action: string) => Boolean(action)),
  unread: 0,
  pathname: "/",
  role: "superadmin",
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: mocks.can, role: mocks.role, isLoading: false }),
}));
vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));
vi.mock("@/hooks/useMessaging", () => ({
  useInboxSummary: () => ({ data: { unread: mocks.unread, total: mocks.unread, max_unread_severity: null } }),
}));

const featureItems = [
  ["overview", "Overview", "/", "view:overview", false],
  ["bdd", "Gherkin Generator", "/bdd", "view:bdd", false],
  ["sanp_health", "SANP Health", "/sanp-health", "view:sanp_health", false],
  ["jira", "KPI Jira", "/jira", "view:jira", false],
  ["nrt_metrics", "NRT Metrics", "/nrt-metrics", "view:nrt_metrics", false],
  ["psp_fees", "PSP Commissioni", "/data-hub/psp-fees", "view:data_hub", false],
  ["gpd_positions", "Posizioni Debitorie GPD", "/data-hub/gpd-positions", "view:data_hub", false],
  ["dq_catalog", "Catalogo Controlli", "/data-quality/catalog", "view:data_quality", false],
  ["dq_domains", "Controlli per Dominio", "/data-quality/domains", "view:data_quality", false],
  ["settings_gherkin", "Settings Gherkin", "/settings/bdd", "manage:bdd", false],
  ["ea_map", "EA Map", "/ea-map", "view:ea_map", false],
  ["docs", "Docs & Decks", "/docs", "view:docs", false],
  ["api_docs", "API Docs", "/api-docs", "view:api_docs", false],
] as const;

const nrtAndFlakyItems = [
  ["nrts", "Non-Regression Tests (NRT)", "/nrts", "view:nrts", false],
  ["flaky_scenarios", "Scenari flaky", "/flaky-scenarios", "view:flaky", false],
] as const;

const releaseStatusItem = ["release_status", "Status Page", "/releases", "view:status_page", false] as const;

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
    mocks.unread = 0;
    mocks.pathname = "/";
    mocks.role = "superadmin";
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
    expect(link).toHaveAttribute("href", "https://grafana.example.com/d/nrt?orgId=1&kiosk&theme=light");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "NRT Metrics (si apre in una nuova scheda)");
    expect(link.querySelector(".lucide-external-link")).toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((item) => item.textContent?.trim());
    expect(labels.indexOf("NRT Metrics")).toBe(labels.indexOf("SANP Health") + 1);
  });

  it("opens NRT Metrics with the theme the user is using, following later changes", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key, label, route, action, external, enabled: true,
      })),
    });
    try {
      renderSidebar();
      const link = await screen.findByRole("link", { name: "NRT Metrics" });
      expect(link).toHaveAttribute("href", "https://grafana.example.com/d/nrt?orgId=1&kiosk&theme=dark");

      act(() => document.documentElement.removeAttribute("data-theme"));
      await waitFor(() =>
        expect(screen.getByRole("link", { name: "NRT Metrics" })).toHaveAttribute(
          "href",
          "https://grafana.example.com/d/nrt?orgId=1&kiosk&theme=light",
        ),
      );
    } finally {
      document.documentElement.removeAttribute("data-theme");
    }
  });

  it("shows the Messaggi entry with the unread count as a pill", async () => {
    mocks.unread = 3;
    renderSidebar();

    const link = await screen.findByRole("link", { name: /Messaggi/ });
    expect(link).toHaveAttribute("href", "/messages");
    expect(within(link).getByTestId("sidebar-unread")).toHaveTextContent("3");
  });

  it("shows the Messaggi entry without a pill when everything has been read", async () => {
    renderSidebar();

    const link = await screen.findByRole("link", { name: /Messaggi/ });
    expect(within(link).queryByTestId("sidebar-unread")).toBeNull();
  });

  it("hides the Messaggi entry without the view:inbox permission", async () => {
    mocks.can.mockImplementation((action: string) => action !== "view:inbox");
    renderSidebar();

    await screen.findByRole("link", { name: "API Docs" });
    expect(screen.queryByRole("link", { name: /Messaggi/ })).toBeNull();
  });

  it("opens API Docs as an internal page, not as a link to the backend", async () => {
    renderSidebar();

    const link = await screen.findByRole("link", { name: "API Docs" });
    expect(link).toHaveAttribute("href", "/api-docs");
    expect(link).not.toHaveAttribute("target");
    expect(link.querySelector(".lucide-external-link")).not.toBeInTheDocument();
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
        "https://pagopa-u-weu-grafana-cpavbjb0axhrdcg3.weu.grafana.azure.com/d/an5bhhc/qa-nrt-metrics?theme=light&orgId=1&from=now-30d&to=now&timezone=browser&var-test_object=checkout&var-test_object=wisp&var-test_object=fdr3&editIndex=0&tab=transformations&kiosk",
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

  it("lists the architecture map right after the overview and its messages entry", async () => {
    renderSidebar();

    expect(await screen.findByRole("link", { name: "EA Map" })).toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((link) => link.textContent?.trim());
    expect(labels.indexOf("Messaggi")).toBe(labels.indexOf("Overview") + 1);
    expect(labels.indexOf("EA Map")).toBe(labels.indexOf("Messaggi") + 1);
  });

  it("lists the flaky scenarios page right after the NRT page", async () => {
    mocks.apiClient.mockResolvedValue({
      items: [...featureItems, ...nrtAndFlakyItems].map(
        ([key, label, route, action, external]) => ({ key, label, route, action, external, enabled: true }),
      ),
    });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Scenari flaky" })).toHaveAttribute("href", "/flaky-scenarios");
    const labels = screen.getAllByRole("link").map((link) => link.textContent?.trim());
    expect(labels.indexOf("Scenari flaky")).toBe(labels.indexOf("Non-Regression Tests (NRT)") + 1);
  });

  it("hides the flaky scenarios page when its feature is disabled", async () => {
    mocks.apiClient.mockResolvedValue({
      items: [...featureItems, ...nrtAndFlakyItems].map(([key, label, route, action, external]) => ({
        key, label, route, action, external, enabled: key !== "flaky_scenarios",
      })),
    });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Scenari flaky" })).not.toBeInTheDocument();
  });

  it("shows Status Page linking to /releases", async () => {
    mocks.apiClient.mockResolvedValue({
      items: [...featureItems, releaseStatusItem].map(
        ([key, label, route, action, external]) => ({ key, label, route, action, external, enabled: true }),
      ),
    });
    renderSidebar();

    const link = await screen.findByRole("link", { name: "Status Page" });
    expect(link).toHaveAttribute("href", "/releases");
    expect(mocks.can).toHaveBeenCalledWith("view:status_page");
  });

  it("hides Status Page when its feature is disabled", async () => {
    mocks.apiClient.mockResolvedValue({
      items: [...featureItems, releaseStatusItem].map(
        ([key, label, route, action, external]) => ({ key, label, route, action, external, enabled: key !== "release_status" }),
      ),
    });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Status Page" })).not.toBeInTheDocument();
  });

  it("hides Status Page when RBAC denies view:status_page", async () => {
    mocks.can.mockImplementation((action) => action !== "view:status_page");
    mocks.apiClient.mockResolvedValue({
      items: [...featureItems, releaseStatusItem].map(
        ([key, label, route, action, external]) => ({ key, label, route, action, external, enabled: true }),
      ),
    });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Status Page" })).not.toBeInTheDocument();
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

  it("hides the API Docs link when its feature is disabled", async () => {
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

  it("hides Gherkin settings when its feature is disabled", async () => {
    mocks.apiClient.mockResolvedValue({
      items: featureItems.map(([key, label, route, action, external]) => ({
        key,
        label,
        route,
        action,
        external,
        enabled: key !== "settings_gherkin",
      })),
    });

    renderSidebar();

    fireEvent.click(await screen.findByRole("button", { name: /Admin/ }));
    expect(screen.getByRole("link", { name: "Settings Utenti" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Settings Gherkin" })).not.toBeInTheDocument(),
    );
  });

  it("shows the superadmin-only settings to a superadmin and hides them from other roles", async () => {
    renderSidebar();
    fireEvent.click(await screen.findByRole("button", { name: /Admin/ }));
    for (const name of ["Settings Utenti", "Settings Pagoda", "Risorse T&M"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("hides the superadmin-only settings from other roles", async () => {
    mocks.role = "admin";
    renderSidebar();
    fireEvent.click(await screen.findByRole("button", { name: /Admin/ }));
    expect(await screen.findByRole("link", { name: "Settings Gherkin" })).toBeInTheDocument();
    for (const name of ["Settings Utenti", "Settings Pagoda", "Risorse T&M"]) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
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

  describe("collapsible sections", () => {
    const allEnabled = () =>
      mocks.apiClient.mockResolvedValue({
        items: featureItems.map(([key, label, route, action, external]) => ({
          key, label, route, action, external, enabled: true,
        })),
      });

    it("keeps Admin closed by default and opens it on click", async () => {
      allEnabled();
      renderSidebar();

      expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Settings Gherkin" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Admin/ }));
      expect(screen.getByRole("link", { name: "Settings Gherkin" })).toBeInTheDocument();
    });

    it("opens the section of the current page", async () => {
      allEnabled();
      mocks.pathname = "/settings/bdd";
      renderSidebar();

      expect(await screen.findByRole("link", { name: "Settings Gherkin" })).toBeInTheDocument();
    });

    it("shows a section whose only visible entries are in a closed section", async () => {
      allEnabled();
      mocks.can.mockImplementation((action: string) => action === "manage:bdd");
      renderSidebar();

      const button = await screen.findByRole("button", { name: /Admin/ });
      expect(button).toHaveAttribute("aria-expanded", "false");
      await waitFor(() => expect(screen.getByTestId("nav-section-count")).toHaveTextContent("4"));
      expect(screen.getAllByRole("button", { name: /Admin|Workspace|Sapere/ })).toHaveLength(1);
    });

    it("puts EA Map in its own Architettura section right after Workspace", async () => {
      allEnabled();
      renderSidebar();

      expect(await screen.findByRole("link", { name: "EA Map" })).toBeInTheDocument();
      const titles = screen.getAllByRole("button").map((b) => b.textContent?.trim());
      expect(titles.indexOf("Architettura")).toBe(titles.indexOf("Workspace") + 1);
    });
  });

  describe("filter", () => {
    beforeEach(() => {
      mocks.apiClient.mockResolvedValue({
        items: [...featureItems, ...nrtAndFlakyItems].map(([key, label, route, action, external]) => ({
          key, label, route, action, external, enabled: true,
        })),
      });
    });
    const filterInput = () => screen.getByRole("searchbox", { name: "Cerca voce" });
    const type = (value: string) => fireEvent.change(filterInput(), { target: { value } });

    it("filters entries by label and drops sections without matches", async () => {
      renderSidebar();
      expect(await screen.findByRole("link", { name: "Scenari flaky" })).toBeInTheDocument();

      type("flaky");
      expect(screen.getByRole("link", { name: "Scenari flaky" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Workspace/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Risultati test/ })).toBeInTheDocument();
    });

    it("ignores case and accents and matches section titles", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("QUALITA");
      expect(screen.getByRole("link", { name: "PSP Commissioni" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Catalogo Controlli" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    });

    it("finds entries inside closed sections and restores the state when cleared", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("pagoda");
      expect(screen.getByRole("link", { name: "Settings Pagoda" })).toBeInTheDocument();
      type("");
      expect(screen.queryByRole("link", { name: "Settings Pagoda" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    });

    it("shows an empty message when nothing matches", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("zzzz");
      expect(screen.getByText("Nessuna voce trovata")).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: /Workspace|Admin|Sapere/ })).toHaveLength(0);
    });

    it("clears the filter with Escape", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("flaky");
      fireEvent.keyDown(filterInput(), { key: "Escape" });
      expect(filterInput()).toHaveValue("");
    });

    it.each([["ctrlKey"], ["metaKey"]])("focuses the filter with %s+K", async (modifier) => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      const notPrevented = fireEvent.keyDown(document.body, { key: "k", [modifier]: true });
      expect(notPrevented).toBe(false);
      expect(filterInput()).toHaveFocus();
    });

    it("matches an accented query", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("qualità");
      expect(screen.getByRole("link", { name: "PSP Commissioni" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    });

    it("clears the filter when the menu collapses to the icon rail", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      type("flaky");
      fireEvent.click(screen.getByRole("button", { name: "Riduci menu" }));
      fireEvent.click(screen.getByRole("button", { name: "Espandi menu" }));
      expect(filterInput()).toHaveValue("");
      expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    });

    it("hints Ctrl K by default and the command key on macOS", async () => {
      const { unmount } = renderSidebar();
      await screen.findByRole("link", { name: "Overview" });
      expect(screen.getByText("Ctrl K")).toBeInTheDocument();
      unmount();

      vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)");
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });
      expect(screen.getByText("⌘ K")).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("does not take Ctrl+K from a dialog or with extra modifiers", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      const field = document.createElement("input");
      dialog.append(field);
      document.body.append(dialog);
      field.focus();
      expect(fireEvent.keyDown(field, { key: "k", ctrlKey: true })).toBe(true);
      expect(filterInput()).not.toHaveFocus();
      dialog.remove();

      expect(fireEvent.keyDown(document.body, { key: "k", ctrlKey: true, shiftKey: true })).toBe(true);
      expect(fireEvent.keyDown(document.body, { key: "k", ctrlKey: true, altKey: true })).toBe(true);
      expect(filterInput()).not.toHaveFocus();
    });

    it("ignores a plain K and the shortcut while the menu is an icon rail", async () => {
      renderSidebar();
      await screen.findByRole("link", { name: "Overview" });

      fireEvent.keyDown(document.body, { key: "k" });
      expect(filterInput()).not.toHaveFocus();

      fireEvent.click(screen.getByRole("button", { name: "Riduci menu" }));
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
      expect(fireEvent.keyDown(document.body, { key: "k", ctrlKey: true })).toBe(true);
    });
  });
});
