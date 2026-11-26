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

describe("highlightLine on a whole feature file", () => {
  it.each([
    ["Funzionalità: Foo", "Funzionalità:", " Foo"],
    ["  Schema dello scenario: x", "Schema dello scenario:", " x"],
    ["    Esempi:", "Esempi:", ""],
    ["Esigenza di Business: x", "Esigenza di Business:", " x"],
    ["Abilità: x", "Abilità:", " x"],
    ["  Regola: x", "Regola:", " x"],
    ["  Scenario: Paga", "Scenario:", " Paga"],
    ["  Contesto:", "Contesto:", ""],
  ])("marks the section keyword of %j", (line, keyword, rest) => {
    const spans = highlightLine(line);
    expect(spans.find((s) => s.kind === "keyword")).toEqual({ text: keyword, kind: "keyword" });
    expect(spans.map((s) => s.text).join("")).toBe(line);
    if (rest) expect(spans[spans.length - 1]).toEqual({ text: rest, kind: "text" });
  });

  it("colours every tag of a tag line, keeping the spaces", () => {
    expect(highlightLine("@FDR3_001 @integration")).toEqual([
      { text: "@FDR3_001", kind: "tag" },
      { text: " ", kind: "text" },
      { text: "@integration", kind: "tag" },
    ]);
    expect(highlightLine("  @runnable @positive")).toEqual([
      { text: "  ", kind: "text" },
      { text: "@runnable", kind: "tag" },
      { text: " ", kind: "text" },
      { text: "@positive", kind: "tag" },
    ]);
  });

  it("marks # language and #link lines as comments", () => {
    expect(highlightLine("# language: it")).toEqual([{ text: "# language: it", kind: "comment" }]);
    expect(highlightLine("  #link:req-1|Requisito")).toEqual([
      { text: "  #link:req-1|Requisito", kind: "comment" },
    ]);
  });

  it("marks table rows and rebuilds them exactly", () => {
    const row = "      | flowid | esito   |";
    expect(highlightLine(row).map((s) => s.kind)).toEqual(["text", "table"]);
    expect(highlightLine(row).map((s) => s.text).join("")).toBe(row);
  });
});

