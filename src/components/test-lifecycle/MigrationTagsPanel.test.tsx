import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MigrationTagsPanel } from "./MigrationTagsPanel";

const mocks = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  usePatchTlMigrationTag: () => ({ mutate: mocks.patch, isPending: false }),
}));

describe("MigrationTagsPanel", () => {
  it("toggles keep/drop for non-category tags", async () => {
    render(
      <MigrationTagsPanel
        tags={[
          { name: "regression", occurrences: 4, decision: "keep", category: false },
          { name: "e2e", occurrences: 9, decision: "keep", category: true },
        ]}
      />,
    );
    expect(screen.getByText("@regression")).toBeInTheDocument();
    expect(screen.getByText("4 volte")).toBeInTheDocument();
    expect(screen.getByText(/Cosa fare:/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Mantieni @regression" }));
    expect(mocks.patch).toHaveBeenCalledWith({ name: "regression", decision: "drop" });
    expect(screen.getByRole("checkbox", { name: "Mantieni @e2e" })).toBeDisabled();
  });

  it("marks removed tags", () => {
    render(<MigrationTagsPanel tags={[{ name: "test", occurrences: 1, decision: "drop", category: false }]} />);
    expect(screen.getByText("1 volta")).toBeInTheDocument();
    expect(screen.getByText("rimosso")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Mantieni @test" })).not.toBeChecked();
  });
});
