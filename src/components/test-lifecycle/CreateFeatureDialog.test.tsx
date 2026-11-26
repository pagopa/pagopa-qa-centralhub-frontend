import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateFeatureDialog } from "./CreateFeatureDialog";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "carla@x.it" } }, status: "authenticated" }),
}));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({
    data: [
      { id: "s1", code: "FdR3", name: "Fondo rischi", repo_folder: "features/fdr3" },
      { id: "s2", code: "POS", name: "POS", repo_folder: "src/e2e/pos" },
    ],
  }),
  useCreateTlFeature: () => ({ mutate: mocks.mutate, isPending: false, isError: false, error: null }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({
    data: {
      items: [
        { id: "u1", email: "anna@x.it", name: "Anna Rossi", is_active: true },
        { id: "u3", email: "carla@x.it", name: "Carla Ex", is_active: false },
      ],
    },
  }),
}));

describe("CreateFeatureDialog", () => {
  beforeEach(() => mocks.mutate.mockReset());

  it("offers only active users as design owner and never preselects an inactive one", () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} />);
    const owner = screen.getByLabelText("Owner design");
    expect(within(owner).getAllByRole("option").map((o) => o.textContent)).toEqual(["Nessuno", "Anna Rossi"]);
    expect(owner).toHaveValue("");
  });

  it("preselects the test type implied by the scope folder", () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} defaultScopeId="s2" />);
    expect(screen.getByLabelText("Test type")).toHaveValue("e2e");
  });

  it("leaves the test type empty when the folder does not imply one", () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} defaultScopeId="s1" />);
    expect(screen.getByLabelText("Test type")).toHaveValue("");
  });

  it("offers the three test types", () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} />);
    const options = within(screen.getByLabelText("Test type")).getAllByRole("option");
    expect(options.map((o) => o.getAttribute("value"))).toEqual(["", "integration", "e2e", "api"]);
  });

  it("sends the chosen test type with the new feature", async () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} defaultScopeId="s1" />);
    await userEvent.type(screen.getByPlaceholderText("Titolo della feature"), "Pagamento");
    await userEvent.selectOptions(screen.getByLabelText("Test type"), "api");
    await userEvent.click(screen.getByRole("button", { name: "Crea feature" }));
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ scope_id: "s1", title: "Pagamento", test_type: "api" }),
      expect.anything(),
    );
  });

  it("sends the implied test type and no test type when none applies", async () => {
    const { unmount } = render(<CreateFeatureDialog open onOpenChange={() => {}} defaultScopeId="s2" />);
    await userEvent.type(screen.getByPlaceholderText("Titolo della feature"), "Cassa");
    await userEvent.click(screen.getByRole("button", { name: "Crea feature" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ test_type: "e2e" }), expect.anything());
    unmount();
    render(<CreateFeatureDialog open onOpenChange={() => {}} defaultScopeId="s1" />);
    await userEvent.type(screen.getByPlaceholderText("Titolo della feature"), "Altro");
    await userEvent.click(screen.getByRole("button", { name: "Crea feature" }));
    expect(mocks.mutate).toHaveBeenLastCalledWith(expect.objectContaining({ test_type: null }), expect.anything());
  });
});
