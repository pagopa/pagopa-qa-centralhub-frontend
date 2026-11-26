import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureFilters, TlFeatureListItem } from "@/types/test-lifecycle";
import { FeatureTable } from "./FeatureTable";

const mocks = vi.hoisted(() => ({ useTlFeatures: vi.fn(), can: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("./TlDeleteDialog", () => ({
  TlDeleteDialog: ({ target }: { target: { kind: string; id: string; label: string } | null }) =>
    target ? <div data-testid="delete-dialog">{`${target.kind}:${target.id}:${target.label}`}</div> : null,
}));

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
    impl_owner_id: null, test_type: null, scenario_count: 2, updated_at: "2026-11-01T10:00:00Z", deletable: true,
  },
  {
    id: "f2", code: "FEAT_002_FdR3", number: 2, title: "Rendicontazione", status: "designed",
    scope_id: "s1", scope_code: "FdR3", design_owner_id: null, reviewer_id: null,
    impl_owner_id: null, test_type: null, scenario_count: 5, updated_at: "2026-11-02T10:00:00Z", deletable: true,
  },
];

function Harness() {
  const [filters, setFilters] = useState<TlFeatureFilters>({});
  return <FeatureTable filters={filters} onFiltersChange={setFilters} />;
}

describe("FeatureTable", () => {
  beforeEach(() => {
    mocks.useTlFeatures.mockReset();
    mocks.can.mockReset();
    mocks.can.mockReturnValue(true);
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

  it("renders view and delete icons for each row", () => {
    render(<Harness />);
    expect(screen.getByRole("link", { name: "Apri feature FEAT_001_FdR3" })).toHaveAttribute("href", "/test-lifecycle/f1");
    expect(screen.getByRole("button", { name: "Elimina feature FEAT_001_FdR3" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Elimina feature FEAT_002_FdR3" })).toBeEnabled();
  });

  it("hides the delete icon without edit:tl_feature", () => {
    mocks.can.mockReturnValue(false);
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Elimina feature/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri feature FEAT_001_FdR3" })).toBeInTheDocument();
  });

  it("disables the delete icon with a tooltip when the feature is not deletable", () => {
    mocks.useTlFeatures.mockReturnValue({ data: [{ ...FEATURES[0], deletable: false }], isLoading: false });
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Elimina feature FEAT_001_FdR3" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringContaining("non eliminabile"));
  });

  it("clicking delete opens the dialog for that feature", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Elimina feature FEAT_002_FdR3" }));
    expect(screen.getByTestId("delete-dialog")).toHaveTextContent("feature:f2:FEAT_002_FdR3");
  });

  it("stops click propagation from the actions cell", async () => {
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <Harness />
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Elimina feature FEAT_001_FdR3" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
