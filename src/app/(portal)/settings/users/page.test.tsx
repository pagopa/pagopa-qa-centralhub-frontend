import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsUsersPage from "./page";

const mocks = vi.hoisted(() => ({
  role: "superadmin",
  apiClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ role: mocks.role, isLoading: false }),
}));

vi.mock("@/lib/api", () => ({ apiClient: mocks.apiClient }));
vi.mock("./UsersTab", () => ({ UsersTab: () => <div>Users panel</div> }));
vi.mock("./RolesTab", () => ({ RolesTab: () => <div>Roles panel</div> }));

const featureItems = [
  {
    key: "metrics",
    label: "Metriche",
    route: "/metrics",
    action: "view:metrics",
    external: false,
    enabled: true,
  },
  {
    key: "api_docs",
    label: "API Docs",
    route: "/api/v1/docs",
    action: "view:api_docs",
    external: true,
    enabled: true,
  },
];

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsUsersPage />
    </QueryClientProvider>,
  );
}

describe("Settings users feature visibility tab", () => {
  beforeEach(() => {
    mocks.role = "superadmin";
    mocks.apiClient.mockReset();
    mocks.apiClient.mockImplementation((path: string) => {
      if (path === "/api/v1/features") {
        return Promise.resolve({ items: featureItems });
      }
      return Promise.resolve({ key: "metrics", enabled: false });
    });
  });

  it("shows page toggles and persists the selected visibility", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Funzionalità" }));

    const metricsToggle = await screen.findByRole("checkbox", { name: "Metriche" });
    expect(metricsToggle).toBeChecked();

    fireEvent.click(metricsToggle);

    await waitFor(() => {
      expect(mocks.apiClient).toHaveBeenCalledWith(
        "/api/v1/features/metrics",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ enabled: false }),
        }),
      );
    });
  });

  it("does not expose feature controls to non-superadmins", () => {
    mocks.role = "qa_manager";
    renderSettings();

    expect(screen.queryByRole("button", { name: "Funzionalità" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Metriche" })).not.toBeInTheDocument();
  });
});
