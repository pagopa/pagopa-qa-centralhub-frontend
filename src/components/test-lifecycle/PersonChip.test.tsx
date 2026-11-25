import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonChip } from "./PersonChip";

describe("PersonChip", () => {
  it("shows the initials and the name", () => {
    render(<PersonChip name="Anna Rossi" />);
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("Anna Rossi")).toBeInTheDocument();
  });

  it("adds a visually hidden label when given", () => {
    render(<PersonChip name="Anna Rossi" label="Reviewer" />);
    expect(screen.getByText("Reviewer")).toHaveClass("sr-only");
  });
});
