import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChangePopover } from "@/components/release-status/ChangePopover";
import type { ChangeSummary } from "@/types/release-status";

// Base UI popovers are far too slow to open under jsdom; use a light stand-in.
vi.mock("@/components/ui/popover", () => import("@/test/popover-mock"));

function makeChanges(overrides: Partial<ChangeSummary> = {}): ChangeSummary {
  return {
    status: "OK",
    direction: "forward",
    items: [
      { kind: "pr", number: 12, title: "Fix the retry loop", author: "alice", url: "https://github.com/pagopa/x/pull/12" },
      { kind: "pr", number: 13, title: "Add health probe", author: null, url: "https://github.com/pagopa/x/pull/13" },
      { kind: "commit", number: null, title: "chore: bump deps", author: "bob", url: "https://github.com/pagopa/x/commit/abc" },
    ],
    total_commits: 7,
    truncated: false,
    compare_url: "https://github.com/pagopa/x/compare/v1.0.0...v1.1.0",
    ...overrides,
  };
}

async function open(changes: ChangeSummary | null) {
  const user = userEvent.setup();
  render(
    <ChangePopover fromVersion="1.0.0" toVersion="1.1.0" changes={changes}>
      1.1.0
    </ChangePopover>,
  );
  await user.click(screen.getByRole("button", { name: "1.1.0" }));
  return user;
}

describe("ChangePopover", () => {
  it("renders only the version when there is no summary", () => {
    render(
      <ChangePopover fromVersion="1.0.0" toVersion="1.1.0" changes={null}>
        1.1.0
      </ChangePopover>,
    );
    expect(screen.getByText("1.1.0")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists pull requests with links, author and the footer", async () => {
    await open(makeChanges());

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Modifiche da 1.0.0 a 1.1.0")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "#12 Fix the retry loop" })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/x/pull/12",
    );
    expect(within(dialog).getByText(/alice/)).toBeInTheDocument();
    expect(within(dialog).getByText("7 commit")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Confronto su GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/pagopa/x/compare/v1.0.0...v1.1.0",
    );
    expect(within(dialog).queryByText("elenco parziale")).not.toBeInTheDocument();
  });

  it("keeps the other commits collapsed by default", async () => {
    const user = await open(makeChanges());

    const dialog = await screen.findByRole("dialog");
    const details = dialog.querySelector("details") as HTMLDetailsElement;
    expect(within(dialog).getByText("Altri commit (1)")).toBeInTheDocument();
    expect(details.open).toBe(false);
    await user.click(within(dialog).getByText("Altri commit (1)"));
    expect(details.open).toBe(true);
  });

  it("flags a partial list", async () => {
    await open(makeChanges({ truncated: true }));
    expect(await screen.findByText("elenco parziale")).toBeInTheDocument();
  });

  it.each([
    ["rollback", "Rollback da 1.0.0 a 1.1.0 — modifiche rimosse"],
    ["diverged", "Modifiche da 1.0.0 a 1.1.0 — le versioni non sono in sequenza"],
    ["identical", "Nessuna modifica tra 1.0.0 e 1.1.0"],
  ] as const)("titles a %s summary", async (direction, title) => {
    await open(makeChanges({ direction }));
    expect(await screen.findByText(title)).toBeInTheDocument();
  });

  it.each([
    ["PENDING", "Riepilogo in preparazione"],
    ["UNAVAILABLE", "Riepilogo non disponibile (le versioni non corrispondono a tag GitHub)"],
    ["ERROR", "Riepilogo non disponibile (GitHub non ha risposto)"],
  ] as const)("explains a %s summary", async (status, text) => {
    await open(makeChanges({ status, direction: null, items: [], compare_url: null }));
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const user = await open(makeChanges());
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
