import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureFilters, TlFeatureListItem } from "@/types/test-lifecycle";
import { FeatureTable } from "./FeatureTable";

const mocks = vi.hoisted(() => ({ useTlFeatures: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlFeatures: mocks.useTlFeatures,
  useTlScopes: () => ({ data: [{ id: "s1", code: "FdR3", name: "Fondo rischi" }] }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({ data: { items: [{ id: "u1", email: "a@x.it", name: "Anna Rossi" }] } }),
}));

const FEATURES: TlFeatureListItem[] = [
  {
    id: "f1", code: "FEAT_001_FdR3", number: 1, title: "Pagamento avviso", status: "draft",
    scope_id: "s1", scope_code: "FdR3", design_owner_id: "u1", reviewer_id: null,
    impl_owner_id: null, scenario_count: 2, updated_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "f2", code: "FEAT_002_FdR3", number: 2, title: "Rendicontazione", status: "designed",
    scope_id: "s1", scope_code: "FdR3", design_owner_id: null, reviewer_id: null,
    impl_owner_id: null, scenario_count: 5, updated_at: "2026-11-02T10:00:00Z",
  },
];

function Harness() {
  const [filters, setFilters] = useState<TlFeatureFilters>({});
  return <FeatureTable filters={filters} onFiltersChange={setFilters} />;
}

describe("FeatureTable", () => {
  beforeEach(() => {
    mocks.useTlFeatures.mockReset();
    mocks.useTlFeatures.mockImplementation((filters: TlFeatureFilters) => ({
      data: FEATURES.filter((f) => !filters.status || f.status === filters.status),
      isLoading: false,
    }));
  });

  it("shows code, title and status badge with a link to the detail", () => {
    render(<Harness />);
    expect(screen.getByRole("link", { name: "FEAT_001_FdR3" })).toHaveAttribute("href", "/test-lifecycle/f1");
    expect(screen.getByText("Pagamento avviso")).toBeInTheDocument();
    const row = screen.getByText("Pagamento avviso").closest("tr")!;
    expect(within(row).getByText("Bozza")).toBeInTheDocument();
    expect(within(row).getByText("Anna Rossi")).toBeInTheDocument();
  });

  it("labels the people filter 'Persona' (owner, reviewer or implementation owner)", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Persona")).toBeInTheDocument();
    expect(screen.queryByLabelText("Owner")).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByLabelText("Stato"), "designed");
    expect(mocks.useTlFeatures).toHaveBeenLastCalledWith({ status: "designed" });
    expect(screen.queryByText("Pagamento avviso")).not.toBeInTheDocument();
    expect(screen.getByText("Rendicontazione")).toBeInTheDocument();
  });
});
