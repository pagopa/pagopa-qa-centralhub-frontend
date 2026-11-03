import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteGuard } from "./RouteGuard";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  replace: vi.fn(),
  pathname: "/bdd",
  can: vi.fn(() => true),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: mocks.can, isLoading: false }),
}));

vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));

function renderGuard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouteGuard action="view:bdd">
          <div>Gherkin page content</div>
        </RouteGuard>
      </QueryClientProvider>,
    ),
  };
}

describe("RouteGuard feature visibility", () => {
  beforeEach(() => {
    mocks.pathname = "/bdd";
    mocks.can.mockReturnValue(true);
    mocks.apiClient.mockReset();
    mocks.apiClient.mockResolvedValue({
      items: [
        {
          key: "bdd",
          label: "Gherkin",
          route: "/bdd",
          action: "view:bdd",
          external: false,
          enabled: false,
        },
      ],
    });
  });

  it("blocks a disabled page even when RBAC allows it", async () => {
    renderGuard();

    expect(await screen.findByRole("status")).toHaveTextContent("Funzionalità non disponibile");
    expect(screen.queryByText("Gherkin page content")).not.toBeInTheDocument();
  });

  it("refreshes visibility when a client navigation changes the route", async () => {
    mocks.apiClient
      .mockResolvedValueOnce({
        items: [{ key: "bdd", label: "Gherkin", route: "/bdd", action: "view:bdd", external: false, enabled: true }],
      })
      .mockResolvedValueOnce({
        items: [{ key: "bdd", label: "Gherkin", route: "/bdd", action: "view:bdd", external: false, enabled: false }],
      });

    const rendered = renderGuard();
    expect(await screen.findByText("Gherkin page content")).toBeInTheDocument();

    mocks.pathname = "/bdd/history";
    rendered.rerender(
      <QueryClientProvider client={rendered.queryClient}>
        <RouteGuard action="view:bdd">
          <div>Gherkin page content</div>
        </RouteGuard>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.apiClient).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent("Funzionalità non disponibile");
  });

  it("still enforces RBAC when the feature is enabled", async () => {
    mocks.can.mockReturnValue(false);
    mocks.apiClient.mockResolvedValue({
      items: [
        {
          key: "bdd",
          label: "Gherkin",
          route: "/bdd",
          action: "view:bdd",
          external: false,
          enabled: true,
        },
      ],
    });

    renderGuard();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Gherkin page content")).not.toBeInTheDocument();
  });

  it("blocks Gherkin settings when that settings feature is disabled", async () => {
    mocks.pathname = "/settings/bdd";
    mocks.apiClient.mockResolvedValue({
      items: [
        {
          key: "settings_gherkin",
          label: "Settings Gherkin",
          route: "/settings/bdd",
          action: "manage:bdd",
          external: false,
          enabled: false,
        },
      ],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <RouteGuard action="manage:bdd">
          <div>Gherkin settings content</div>
        </RouteGuard>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Funzionalità non disponibile");
    expect(screen.queryByText("Gherkin settings content")).not.toBeInTheDocument();
  });
});
