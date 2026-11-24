import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScopeOverview } from "./ScopeOverview";

const mocks = vi.hoisted(() => ({ can: vi.fn() }));

vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: mocks.can }) }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    isLoading: false,
    isError: false,
    data: [
      { id: "s1", code: "FdR3", name: "Fondo", area: null, feature_count: 2, status_counts: { running: 2 }, nrt_pass_rate: 0.8, deletable: true },
      { id: "s2", code: "CUP", name: "Cup", area: null, feature_count: 1, status_counts: { draft: 1 }, nrt_pass_rate: null, deletable: false },
    ],
  }),
}));

beforeEach(() => {
  mocks.can.mockReset();
  mocks.can.mockReturnValue(true);
});

describe("ScopeOverview", () => {
  it("shows the NRT pass rate only for scopes with executions", () => {
    render(<ScopeOverview />);
    expect(screen.getByText("NRT 80%")).toBeInTheDocument();
    expect(screen.getAllByText(/^NRT /)).toHaveLength(1);
  });

  it("selects a scope card with the keyboard", async () => {
    const onSelect = vi.fn();
    render(<ScopeOverview onSelect={onSelect} />);
    screen.getByRole("button", { name: /^FdR3/ }).focus();
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
