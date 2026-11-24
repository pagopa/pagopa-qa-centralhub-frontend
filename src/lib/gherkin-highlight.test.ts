import { describe, expect, it } from "vitest";
import { highlightLine } from "./gherkin-highlight";

const rebuild = (line: string) => highlightLine(line).map((s) => s.text).join("");

describe("highlightLine", () => {
  it("splits a keyword from the rest of the step", () => {
    expect(highlightLine("Quando L'utente clicca")).toEqual([
      { text: "Quando", kind: "keyword" },
      { text: " L'utente clicca", kind: "text" },
    ]);
  });

  it("matches Dato che before Dato", () => {
    expect(highlightLine("Dato che il sistema è pronto")[0]).toEqual({ text: "Dato che", kind: "keyword" });
  });

  it("does not treat a word starting with E as the keyword E", () => {
    expect(highlightLine("Elenco")).toEqual([{ text: "Elenco", kind: "text" }]);
  });

  it("matches a keyword alone on the line", () => {
    expect(highlightLine("Allora")).toEqual([{ text: "Allora", kind: "keyword" }]);
  });

  it("keeps leading spaces and rebuilds the line exactly", () => {
    for (const line of ["", "   ", "  E il PSP risponde", "Dato x @tag y", "# nota", "\tQuando\tx", "E"]) {
      expect(rebuild(line)).toBe(line);
    }
    expect(highlightLine("  E il PSP")[0].text).toBe("  ");
  });

  it("marks a # line as comment", () => {
    expect(highlightLine("  # nota")).toEqual([{ text: "  # nota", kind: "comment" }]);
  });

  it("marks @tags inside the text", () => {
    expect(highlightLine("Dato x @tag y")).toEqual([
      { text: "Dato", kind: "keyword" },
      { text: " x ", kind: "text" },
      { text: "@tag", kind: "tag" },
      { text: " y", kind: "text" },
    ]);
  });

  it("is case sensitive", () => {
    expect(highlightLine("quando x")).toEqual([{ text: "quando x", kind: "text" }]);
  });
});
