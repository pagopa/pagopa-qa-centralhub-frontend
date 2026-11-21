import { describe, expect, it } from "vitest";
import { applySuggestion, currentStepQuery } from "@/lib/step-autocomplete";

describe("currentStepQuery", () => {
  it("maps Italian keywords and returns the text after the keyword", () => {
    const text = "Dato un ut";
    expect(currentStepQuery(text, text.length)).toEqual({ keyword: "given", query: "un ut", lineStart: 0 });
    expect(currentStepQuery("Quando paga", 11)?.keyword).toBe("when");
    expect(currentStepQuery("Allora vede", 11)?.keyword).toBe("then");
    expect(currentStepQuery("Dati due utenti", 15)?.keyword).toBe("given");
  });

  it("lets E and Ma inherit the keyword of the previous step line", () => {
    const text = "Dato un utente\nQuando paga\nE conferma";
    expect(currentStepQuery(text, text.length)).toEqual({
      keyword: "when", query: "conferma", lineStart: text.indexOf("E conferma"),
    });
    const text2 = "Allora vede\n  | a |\nMa non ri";
    expect(currentStepQuery(text2, text2.length)?.keyword).toBe("then");
  });

  it("returns null outside a step line or before the keyword ends", () => {
    expect(currentStepQuery("| a | b |", 5)).toBeNull();
    expect(currentStepQuery("Dat", 3)).toBeNull();
    expect(currentStepQuery("Dato x\nE", 8)).toBeNull();
  });
});

describe("applySuggestion", () => {
  it("replaces the text after the keyword on the current line and keeps the keyword", () => {
    const text = "Dato un utente\nE un ca\nAllora ok";
    const caret = text.indexOf("\nAllora");
    const out = applySuggestion(text, caret, "un carrello con 2 articoli");
    expect(out.text).toBe("Dato un utente\nE un carrello con 2 articoli\nAllora ok");
    expect(out.caret).toBe("Dato un utente\nE un carrello con 2 articoli".length);
  });

  it("keeps leading indentation", () => {
    const out = applySuggestion("  Quando pa", 11, "paga online");
    expect(out.text).toBe("  Quando paga online");
  });
});
