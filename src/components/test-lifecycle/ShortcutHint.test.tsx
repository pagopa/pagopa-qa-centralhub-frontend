import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShortcutHint } from "./ShortcutHint";

describe("ShortcutHint", () => {
  it("lists the three shortcuts", () => {
    render(<ShortcutHint />);
    const hint = screen.getByText(/Ctrl\+S/);
    expect(hint).toHaveTextContent("salva");
    expect(hint).toHaveTextContent("Ctrl+Invio");
    expect(hint).toHaveTextContent("Ctrl+Maiusc+D");
  });
});
