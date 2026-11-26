import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocsPage from "./page";
import type { DocItem } from "@/types/index";

const hooks = vi.hoisted(() => ({ items: vi.fn() }));
const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));

vi.mock("@/hooks/useDocs", () => ({
  useDocItems: hooks.items,
  useCreateDocItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDocItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDocItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
}));

vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function doc(over: Partial<DocItem>): DocItem {
  return {
    id: "d1",
    title: "Guida QA",
    description: null,
    url: "https://example.org/guida",
    type: "external",
    category: "Processi & Guide",
    icon: "page",
    thumbnail_url: null,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const EXTERNAL = doc({ id: "ext-1", title: "Link esterno" });
const EMBEDDED = doc({ id: "emb-1", title: "Pagina inline", type: "embedded", position: 1 });
const VIDEO = doc({ id: "vid-1", title: "Video demo", url: "https://example.org/demo.mp4", position: 2 });

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  hooks.items.mockReturnValue({ data: [EXTERNAL, EMBEDDED, VIDEO], isLoading: false });
});

describe("Docs & Decks share link", () => {
  it("has a copy link button on every card", () => {
    render(<DocsPage />);
    expect(screen.getAllByRole("button", { name: "Copia link" })).toHaveLength(3);
  });

  it("copies the address that opens the hub on that item", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    render(<DocsPage />);

    const card = screen.getByText("Pagina inline").closest("div.group") as HTMLElement;
    await user.click(card.querySelector('button[aria-label="Copia link"]') as HTMLElement);

    expect(write).toHaveBeenCalledWith(`${window.location.origin}/docs?item=emb-1`);
    expect(await screen.findByRole("button", { name: "Link copiato" })).toBeInTheDocument();
  });

  it("opens an inline item straight away when the link points at it", () => {
    nav.search = "item=emb-1";
    render(<DocsPage />);
    expect(screen.getByTitle("Pagina inline")).toBeInTheDocument();
  });

  it("opens a video in the player when the link points at it", () => {
    nav.search = "item=vid-1";
    render(<DocsPage />);
    expect(screen.getByRole("dialog", { name: "Video demo" })).toBeInTheDocument();
  });

  it("drops the item from the address when the opened item is closed", async () => {
    const user = userEvent.setup();
    nav.search = "item=vid-1";
    render(<DocsPage />);
    await user.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(nav.replace).toHaveBeenCalledWith("/docs", { scroll: false });
  });

  it("highlights an external link instead of opening a blocked tab", () => {
    nav.search = "item=ext-1";
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<DocsPage />);
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const card = screen.getByText("Link esterno").closest("div.group") as HTMLElement;
    expect(card.style.borderColor).toBe("var(--accent)");
  });

  it("says so when the linked item no longer exists", () => {
    nav.search = "item=gone";
    render(<DocsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Il contenuto richiesto dal link non esiste più.");
  });

  it("shows no notice while the items are still loading", () => {
    nav.search = "item=emb-1";
    hooks.items.mockReturnValue({ data: undefined, isLoading: true });
    render(<DocsPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
