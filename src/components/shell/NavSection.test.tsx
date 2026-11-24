import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavSection } from "./NavSection";

function stubStorage() {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  return storage;
}

type Props = Partial<React.ComponentProps<typeof NavSection>>;
const renderSection = (props: Props = {}) =>
  render(
    <NavSection id="test" label="Risultati" tone="green" count={2} hasActive={false} forceOpen={false} rail={false} {...props}>
      <a href="/a">Voce A</a>
      <a href="/b">Voce B</a>
    </NavSection>,
  );

describe("NavSection", () => {
  beforeEach(() => {
    stubStorage();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders children when open and toggles on click", () => {
    renderSection();
    const button = screen.getByRole("button", { name: /Risultati/ });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Voce A" })).not.toBeInTheDocument();
  });

  it("starts closed when defaultClosed", () => {
    renderSection({ defaultClosed: true });
    expect(screen.getByRole("button", { name: /Risultati/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Voce A" })).not.toBeInTheDocument();
  });

  it("shows the entry count only while closed", () => {
    renderSection({ defaultClosed: true, count: 4 });
    expect(screen.getByTestId("nav-section-count")).toHaveTextContent("4");
    fireEvent.click(screen.getByRole("button", { name: /Risultati/ }));
    expect(screen.queryByTestId("nav-section-count")).not.toBeInTheDocument();
  });

  it("remembers the state across remounts", () => {
    const first = renderSection();
    fireEvent.click(screen.getByRole("button", { name: /Risultati/ }));
    first.unmount();
    renderSection();
    expect(screen.getByRole("button", { name: /Risultati/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens by itself when it becomes the active section", () => {
    const { rerender } = renderSection({ defaultClosed: true });
    expect(screen.queryByRole("link", { name: "Voce A" })).not.toBeInTheDocument();
    rerender(
      <NavSection id="test" label="Risultati" tone="green" count={2} hasActive forceOpen={false} rail={false} defaultClosed>
        <a href="/a">Voce A</a>
      </NavSection>,
    );
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
  });

  it("opens an active section on first render", () => {
    renderSection({ defaultClosed: true, hasActive: true });
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
  });

  it("opens an active section without saving the choice, so it is closed again elsewhere", () => {
    const storage = stubStorage();
    const first = renderSection({ defaultClosed: true, hasActive: true });
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
    expect(storage.has("qa-hub-nav-open-test")).toBe(false);
    first.unmount();

    renderSection({ defaultClosed: true, hasActive: false });
    expect(screen.queryByRole("link", { name: "Voce A" })).not.toBeInTheDocument();
  });

  it("lets the user close the section of the current page", () => {
    renderSection({ defaultClosed: true, hasActive: true });
    fireEvent.click(screen.getByRole("button", { name: /Risultati/ }));
    expect(screen.queryByRole("link", { name: "Voce A" })).not.toBeInTheDocument();
  });

  it("opens again when the page returns to the section", () => {
    const props = { id: "test", label: "Risultati", tone: "green" as const, count: 2, forceOpen: false, rail: false, defaultClosed: true };
    const children = <a href="/a">Voce A</a>;
    const { rerender } = render(<NavSection {...props} hasActive>{children}</NavSection>);
    fireEvent.click(screen.getByRole("button", { name: /Risultati/ }));
    rerender(<NavSection {...props} hasActive={false}>{children}</NavSection>);
    rerender(<NavSection {...props} hasActive>{children}</NavSection>);
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
  });

  it("keeps aria-controls pointing at an existing container, open or closed", () => {
    renderSection();
    const button = screen.getByRole("button", { name: /Risultati/ });
    const id = button.getAttribute("aria-controls") as string;
    expect(document.getElementById(id)).not.toBeNull();
    fireEvent.click(button);
    expect(document.getElementById(id)).not.toBeNull();
  });

  it("names the closed header with its entry count", () => {
    renderSection({ defaultClosed: true, count: 2 });
    expect(screen.getByRole("button", { name: "Risultati (2 voci)" })).toBeInTheDocument();
  });

  it("ignores clicks on the title while filtering", () => {
    const props = { id: "test", label: "Risultati", tone: "green" as const, count: 2, hasActive: false, rail: false };
    const { rerender } = render(<NavSection {...props} forceOpen><a href="/a">Voce A</a></NavSection>);
    fireEvent.click(screen.getByRole("button", { name: /Risultati/ }));
    rerender(<NavSection {...props} forceOpen={false}><a href="/a">Voce A</a></NavSection>);
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
  });

  it("ignores the stored state when forceOpen", () => {
    renderSection({ defaultClosed: true, forceOpen: true });
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
  });

  it("renders all children and no button in rail mode", () => {
    renderSection({ defaultClosed: true, rail: true });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voce A" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voce B" })).toBeInTheDocument();
  });
});
