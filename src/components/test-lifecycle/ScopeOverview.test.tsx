import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScopeOverview } from "./ScopeOverview";

const DEFAULT_SCOPES = [
  { id: "s1", code: "FdR3", name: "Fondo", area: null, feature_count: 2, status_counts: { running: 2 }, nrt_pass_rate: 0.8, deletable: true },
  { id: "s2", code: "CUP", name: "Cup", area: null, feature_count: 1, status_counts: { draft: 1 }, nrt_pass_rate: null, deletable: false },
];
const mocks = vi.hoisted(() => ({ can: vi.fn(), scopes: [] as unknown[] }));

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    isLoading: false,
    isError: false,
    data: mocks.scopes,
  }),
}));

beforeEach(() => {
  mocks.scopes = DEFAULT_SCOPES;
  mocks.can.mockReset();
  mocks.can.mockReturnValue(true);
});

describe("ScopeOverview", () => {
  it("groups areas that differ only by case or surrounding spaces under one heading", () => {
    mocks.scopes = [
      { ...DEFAULT_SCOPES[0], area: "Core" },
      { ...DEFAULT_SCOPES[1], area: " CORE " },
    ];
    render(<ScopeOverview />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("shows the NRT pass rate only for scopes with executions", () => {
    render(<ScopeOverview />);
    expect(screen.getByText("NRT 80%")).toBeInTheDocument();
    expect(screen.getAllByText(/^NRT /)).toHaveLength(1);
  });

  it("shows the name as the title of the card and the code as a label next to it", () => {
    render(<ScopeOverview />);
    const card = screen.getByRole("button", { name: /^Fondo/ });
    expect(card).toHaveTextContent("Fondo");
    expect(within(card).getByText("FdR3")).toHaveClass("font-mono");
    expect(within(card).getByText("Fondo")).toHaveClass("font-semibold");
  });

  it("selects a scope card with the keyboard", async () => {
    const onSelect = vi.fn();
    render(<ScopeOverview onSelect={onSelect} />);
    screen.getByRole("button", { name: /^Fondo/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("scope action icons do not select the card", async () => {
    const onSelect = vi.fn();
    const onEditScope = vi.fn();
    const onDeleteScope = vi.fn();
    render(<ScopeOverview onSelect={onSelect} onEditScope={onEditScope} onDeleteScope={onDeleteScope} />);
    await userEvent.click(screen.getByRole("button", { name: "Modifica ambito FdR3" }));
    await userEvent.click(screen.getByRole("button", { name: "Elimina ambito FdR3" }));
    expect(onEditScope).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
    expect(onDeleteScope).toHaveBeenCalledWith(expect.objectContaining({ id: "s1" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("hides the action icons without manage:tl_scopes", () => {
    mocks.can.mockReturnValue(false);
    render(<ScopeOverview onEditScope={vi.fn()} onDeleteScope={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Elimina ambito/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifica ambito/ })).not.toBeInTheDocument();
  });

  it("disables the delete icon for a non deletable scope", () => {
    render(<ScopeOverview onEditScope={vi.fn()} onDeleteScope={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Elimina ambito CUP" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringContaining("non eliminabile"));
    expect(screen.getByRole("button", { name: "Elimina ambito FdR3" })).toBeEnabled();
  });
});
