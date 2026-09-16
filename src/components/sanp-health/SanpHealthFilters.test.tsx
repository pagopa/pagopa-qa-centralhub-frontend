import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SanpHealthFilters } from "@/components/sanp-health/SanpHealthFilters";

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: ReactNode }) => <button {...props}>{children}</button>,
  SelectValue: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SelectContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="select-content" className={className}>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("SanpHealthFilters", () => {
  it("uses semantic surface colors for both select popups", () => {
    const { getAllByTestId } = render(
      <SanpHealthFilters
        filters={{ search: "", environment: "ALL", status: "ALL" }}
        allExpanded={false}
        onChange={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );

    for (const content of getAllByTestId("select-content")) {
      expect(content).toHaveClass("bg-surface", "text-text");
    }
  });
});