import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestLifecycleLayout from "./layout";

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  replace: vi.fn(),
  pathname: "/test-lifecycle",
  can: vi.fn<(action: string) => boolean>(() => true),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: mocks.can, isLoading: false }),
}));

vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));

function features(enabled: boolean) {
  return {
    items: [
      {
        key: "test_lifecycle",
        label: "Test Lifecycle",
        route: "/test-lifecycle",
        action: "view:test_lifecycle",
        external: false,
        enabled,
      },
    ],
  };
}

function renderLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TestLifecycleLayout>
        <div>Test Lifecycle content</div>
      </TestLifecycleLayout>
    </QueryClientProvider>,
  );
}

describe("Test Lifecycle layout guard", () => {
  beforeEach(() => {
    mocks.pathname = "/test-lifecycle";
    mocks.replace.mockReset();
    mocks.can.mockReset();
    mocks.can.mockReturnValue(true);
    mocks.apiClient.mockReset();
  });

  it("renders the page when the feature is enabled and the user can view it", async () => {
    mocks.apiClient.mockResolvedValue(features(true));
    renderLayout();
    expect(await screen.findByText("Test Lifecycle content")).toBeInTheDocument();
    expect(mocks.can).toHaveBeenCalledWith("view:test_lifecycle");
  });

  it("does not render the page when the feature is disabled", async () => {
    mocks.apiClient.mockResolvedValue(features(false));
    mocks.pathname = "/test-lifecycle/some-id";
    renderLayout();
    expect(await screen.findByRole("status")).toHaveTextContent("Funzionalità non disponibile");
    expect(screen.queryByText("Test Lifecycle content")).not.toBeInTheDocument();
  });

  it("does not render the page and redirects without the view permission", async () => {
    mocks.apiClient.mockResolvedValue(features(true));
    mocks.can.mockImplementation((action: string) => action !== "view:test_lifecycle");
    renderLayout();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Test Lifecycle content")).not.toBeInTheDocument();
  });
});
