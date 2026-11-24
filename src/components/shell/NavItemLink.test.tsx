import { render, screen } from "@testing-library/react";
import { Home } from "lucide-react";
import { describe, expect, it } from "vitest";
import { NavItemLink, areaStyle } from "./NavItemLink";
import type { NavItem } from "./nav-config";

const item: NavItem = { href: "/", label: "Overview", icon: Home };
const messages: NavItem = { href: "/messages", label: "Messaggi", icon: Home };
const external: NavItem = { href: "", label: "NRT Metrics", icon: Home, external: true };

describe("NavItemLink", () => {
  it("marks the active entry with aria-current page", () => {
    const { rerender } = render(<NavItemLink item={item} href="/" tone="blue" active rail={false} />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    rerender(<NavItemLink item={item} href="/" tone="blue" active={false} rail={false} />);
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("shows the unread pill when expanded and hides it in the rail", () => {
    const { rerender } = render(<NavItemLink item={messages} href="/messages" tone="blue" active={false} rail={false} unread={3} />);
    expect(screen.getByTestId("sidebar-unread")).toHaveTextContent("3");
    rerender(<NavItemLink item={messages} href="/messages" tone="blue" active={false} rail unread={3} />);
    expect(screen.queryByTestId("sidebar-unread")).not.toBeInTheDocument();
  });

  it("keeps the accessible name and title in the rail", () => {
    render(<NavItemLink item={item} href="/" tone="blue" active={false} rail />);
    const link = screen.getByRole("link", { name: "Overview" });
    expect(link).toHaveAttribute("title", "Overview");
  });

  it("opens external entries in a new tab", () => {
    render(<NavItemLink item={external} href="https://grafana.example.com" tone="green" active={false} rail={false} />);
    const link = screen.getByRole("link", { name: "NRT Metrics" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "NRT Metrics (si apre in una nuova scheda)");
  });

  it("renders an external entry without href as disabled text", () => {
    render(<NavItemLink item={external} href="" tone="green" active={false} rail={false} />);
    expect(screen.queryByRole("link", { name: "NRT Metrics" })).not.toBeInTheDocument();
    expect(screen.getByText("NRT Metrics")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("areaStyle", () => {
  it("maps a tone to the area custom properties", () => {
    expect(areaStyle("coral")).toEqual({ "--area": "var(--area-coral)", "--area-soft": "var(--area-coral-soft)" });
  });
});
