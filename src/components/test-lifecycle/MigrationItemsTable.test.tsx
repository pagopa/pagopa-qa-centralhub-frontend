import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MigrationItemsTable } from "./MigrationItemsTable";
import { migrationItem } from "./migrationTestData";

const mocks = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  usePatchTlMigrationItem: () => ({ mutate: mocks.patch, isPending: false }),
}));

describe("MigrationItemsTable", () => {
  beforeEach(() => mocks.patch.mockReset());

  it("shows rows with problems, safe links and quick decisions", async () => {
    const onEdit = vi.fn();
    render(
      <MigrationItemsTable
        items={[
          migrationItem({ problems: [{ code: "number_conflict", message: "Numero già usato" }] }),
          migrationItem({ id: "i2", page_url: "javascript:x", page_title: "FEAT_002", title: "Due", file_path: null,
            effective: { ...migrationItem().effective, number: 2, title: "Due", file_path: null } }),
        ]}
        onEdit={onEdit}
      />,
    );
    const first = screen.getByTestId("migration-row-i1");
    expect(within(first).getByText("Numero già usato")).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: "FEAT_001_FdR3 - Creazione" })).toHaveAttribute("href", "https://wiki.test/p1");
    const second = screen.getByTestId("migration-row-i2");
    expect(within(second).queryByRole("link")).toBeNull();
    expect(within(second).getByText("Nessun file")).toBeInTheDocument();
    await userEvent.click(within(first).getByRole("button", { name: "Conferma" }));
    expect(mocks.patch).toHaveBeenCalledWith({ id: "i1", decision: "confirmed" }, expect.anything());
    await userEvent.click(within(second).getByRole("button", { name: "Escludi" }));
    expect(mocks.patch).toHaveBeenCalledWith({ id: "i2", decision: "excluded" }, expect.anything());
    await userEvent.click(within(first).getByRole("button", { name: "Correggi" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "i1" }));
  });

  it("shows executed rows with a link to the feature and no actions", () => {
    render(<MigrationItemsTable items={[migrationItem({ executed_at: "2026-11-21T10:00:00Z", feature_id: "f1" })]} onEdit={vi.fn()} />);
    const row = screen.getByTestId("migration-row-i1");
    expect(within(row).getByRole("link", { name: "Apri feature" })).toHaveAttribute("href", "/test-lifecycle/f1");
    expect(within(row).queryByRole("button")).toBeNull();
  });
});
