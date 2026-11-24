import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveIndicator } from "./SaveIndicator";

describe("SaveIndicator", () => {
  it("renders the saving text", () => {
    render(<SaveIndicator state={{ phase: "saving", savedAt: null, error: null }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Salvataggio…");
  });

  it("renders the error text with the message as title", () => {
    render(<SaveIndicator state={{ phase: "error", savedAt: null, error: "Boom" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Errore di salvataggio");
    expect(screen.getByRole("status")).toHaveAttribute("title", "Boom");
  });

  it("renders the last saved time", () => {
    const at = new Date(2026, 10, 24, 14, 32).getTime();
    render(<SaveIndicator state={{ phase: "idle", savedAt: at, error: null }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Salvato alle 14:32");
  });

  it("renders nothing visible when idle and never saved", () => {
    render(<SaveIndicator state={{ phase: "idle", savedAt: null, error: null }} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
