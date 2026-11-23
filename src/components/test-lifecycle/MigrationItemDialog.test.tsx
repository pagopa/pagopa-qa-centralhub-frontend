import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MigrationItemDialog } from "./MigrationItemDialog";
import { migrationItem } from "./migrationTestData";

const mocks = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  usePatchTlMigrationItem: () => ({ mutateAsync: mocks.patch, isPending: false }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({ data: { items: [{ id: "u1", name: "Anna", email: "a@x.it", is_active: true }] } }),
}));

describe("MigrationItemDialog", () => {
  beforeEach(() => mocks.patch.mockReset().mockResolvedValue({}));

  it("sends only changed fields and confirms", async () => {
    const onOpenChange = vi.fn();
    render(<MigrationItemDialog item={migrationItem()} open onOpenChange={onOpenChange} />);
    const number = screen.getByLabelText("Numero");
    await userEvent.clear(number);
    await userEvent.type(number, "7");
    await userEvent.selectOptions(screen.getByLabelText("Owner"), "u1");
    await userEvent.click(screen.getByRole("button", { name: "Salva e conferma" }));
    expect(mocks.patch).toHaveBeenCalledWith({
      id: "i1", decision: "confirmed", overrides: { number: 7, owner_id: "u1" },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("excludes the row and shows backend validation errors", async () => {
    render(<MigrationItemDialog item={migrationItem()} open onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Escludi" }));
    expect(mocks.patch).toHaveBeenCalledWith({ id: "i1", decision: "excluded", overrides: {} });
  });
});
