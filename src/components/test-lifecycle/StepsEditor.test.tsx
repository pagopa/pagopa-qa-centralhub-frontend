import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepsEditor } from "./StepsEditor";

const LONG = "Dato " + "un passo molto lungo ".repeat(20);

describe("StepsEditor", () => {
  it("scrolls long lines horizontally instead of clipping them", () => {
    render(<StepsEditor value={`${LONG}\nQuando paga`} />);
    const textarea = screen.getByLabelText("Step");
    expect(textarea).toHaveAttribute("wrap", "off");
    expect(textarea).toHaveClass("whitespace-pre");
    const scroller = screen.getByTestId("steps-scroll");
    expect(scroller).toHaveClass("overflow-x-auto");
    // The content box is as wide as the longest line, so the wrapper can scroll to it.
    expect(textarea.parentElement).toHaveStyle({ minWidth: `calc(${LONG.length + 2}ch + 1rem)` });
    // The gutter sits outside the horizontal scroller: line numbers stay aligned and visible.
    expect(scroller).not.toContainElement(screen.getByTestId("steps-line-1"));
  });

  it("keeps one gutter line per text line", () => {
    render(<StepsEditor value={"a\nb\nc\nd"} />);
    expect(screen.getByTestId("steps-line-4")).toBeInTheDocument();
    expect(screen.getByLabelText("Step")).toHaveAttribute("rows", "4");
  });

  it("shows a notice when provided", () => {
    render(<StepsEditor value="" notice="Validazione non disponibile" />);
    expect(screen.getByRole("status")).toHaveTextContent("Validazione non disponibile");
  });
});
