import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateFeatureDialog } from "./CreateFeatureDialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "carla@x.it" } }, status: "authenticated" }),
}));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlScopes: () => ({ data: [{ id: "s1", code: "FdR3", name: "Fondo rischi" }] }),
  useCreateTlFeature: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
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
  it("offers only active users as design owner and never preselects an inactive one", () => {
    render(<CreateFeatureDialog open onOpenChange={() => {}} />);
    const owner = screen.getByLabelText("Owner design");
    expect(within(owner).getAllByRole("option").map((o) => o.textContent)).toEqual(["Nessuno", "Anna Rossi"]);
    expect(owner).toHaveValue("");
  });
});
