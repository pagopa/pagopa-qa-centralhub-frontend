import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail } from "@/types/test-lifecycle";
import { MigrationInfo } from "./MigrationInfo";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), perms: new Set(["edit:tl_feature"]) }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useUpdateTlFeature: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (a: string) => mocks.perms.has(a) }),
}));

function feature(o: Partial<TlFeatureDetail> = {}): TlFeatureDetail {
  return {
    id: "f1",
    migrated_from: { page_id: "p1", page_url: "https://wiki.test/p1", file_path: "src/a.feature", commit_sha: "abc" },
    alignment_pending: true,
    migration_note: "Scenario 03 da riscrivere",
    ...o,
  } as TlFeatureDetail;
}

describe("MigrationInfo", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.perms = new Set(["edit:tl_feature"]);
  });

  it("shows origin, pending alignment and edits the note", async () => {
    render(<MigrationInfo feature={feature()} />);
    expect(screen.getByRole("link", { name: "Migrata da Confluence" })).toHaveAttribute("href", "https://wiki.test/p1");
    expect(screen.getByText(/Allineamento Git in attesa/)).toBeInTheDocument();
    const note = screen.getByLabelText("Nota di migrazione");
    expect(note).toHaveValue("Scenario 03 da riscrivere");
    await userEvent.clear(note);
    await userEvent.type(note, "Controllata");
    note.blur();
    expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", migration_note: "Controllata" }, expect.anything());
  });

  it("is read-only without permission, plain text for unsafe links, hidden when not migrated", () => {
    mocks.perms = new Set();
    const { rerender, container } = render(
      <MigrationInfo feature={feature({ alignment_pending: false, migrated_from: { page_id: "p1", page_url: "javascript:x", file_path: null, commit_sha: null } })} />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Migrata da Confluence")).toBeInTheDocument();
    expect(screen.queryByText(/Allineamento Git in attesa/)).toBeNull();
    expect(screen.getByLabelText("Nota di migrazione")).toHaveAttribute("readonly");
    rerender(<MigrationInfo feature={feature({ migrated_from: null })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
