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

  it("makes the textarea see-through with inline styles, so the global form-control colours cannot cover the highlight layer", () => {
    // globals.css sets color/background on every textarea outside any @layer, which beats Tailwind
    // utilities: only inline styles keep the coloured mirror visible.
    render(<StepsEditor value={"Dato un utente"} />);
    const textarea = screen.getByLabelText("Step");
    expect(textarea.style.color).toBe("transparent");
    expect(textarea.style.backgroundColor).toBe("transparent");
    expect(textarea.style.caretColor).toBe("var(--text)");
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

  it("colours the keyword of each line", () => {
    render(<StepsEditor value={"Quando clicca\nAllora vede"} />);
    const keyword = screen.getByTestId("steps-mirror-1").querySelector("[data-kind='keyword']");
    expect(keyword).toHaveTextContent("Quando");
    expect(keyword).toHaveStyle({ color: "var(--accent)" });
    expect(screen.getByLabelText("Step")).toHaveValue("Quando clicca\nAllora vede");
  });

  it("keeps error lines highlighted", () => {
    render(<StepsEditor value={"Quando x\nbad"} errors={[{ line: 2, message: "Riga non valida" }]} />);
    expect(screen.getByTestId("steps-mirror-2")).toHaveStyle({ background: "var(--danger-soft)" });
  });
});
