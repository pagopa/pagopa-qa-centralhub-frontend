import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrationItem, migrationScope } from "@/components/test-lifecycle/migrationTestData";
import Page from "./page";

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(),
  patch: vi.fn(),
  can: true,
  write: false,
  filters: [] as unknown[],
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlMigration: () => ({
    data: {
      status: "idle", analyzed_at: "2026-11-21T10:00:00Z", error: null, confluence_write: mocks.write,
      scopes: [migrationScope()], tags: [],
    },
    isLoading: false,
    isError: false,
  }),
  useTlMigrationItems: (filters: unknown) => {
    mocks.filters.push(filters);
    return { data: [migrationItem()], isLoading: false, isError: false };
  },
  useAnalyzeTlMigration: () => ({ mutateAsync: mocks.analyze, isPending: false }),
  usePatchTlMigrationItem: () => ({ mutate: mocks.patch, mutateAsync: mocks.patch, isPending: false }),
  usePatchTlMigrationTag: () => ({ mutate: vi.fn(), isPending: false }),
  useExecuteTlMigrationScope: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRetryTlMigrationPr: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRetryTlMigrationConfluence: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useUsers", () => ({ useUsers: () => ({ data: { items: [] } }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => mocks.can }) }));

describe("migration page", () => {
  beforeEach(() => {
    mocks.analyze.mockReset().mockResolvedValue({});
    mocks.can = true;
    mocks.write = false;
    mocks.filters = [];
  });

  it("analyzes, warns that Confluence writing is off and filters by scope", async () => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: "Migrazione da Confluence" })).toBeInTheDocument();
    expect(screen.getByText(/scrittura su Confluence è disattivata/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Analizza" }));
    expect(mocks.analyze).toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText("Ambito"), "FdR3");
    expect(mocks.filters).toContainEqual({ scope_code: "FdR3" });
    expect(screen.getByTestId("migration-row-i1")).toBeInTheDocument();
  });

  it("hides everything without the migration permission", () => {
    mocks.can = false;
    render(<Page />);
    expect(screen.queryByRole("button", { name: "Analizza" })).toBeNull();
    expect(screen.getByText(/Serve il permesso di migrazione/)).toBeInTheDocument();
  });
});
