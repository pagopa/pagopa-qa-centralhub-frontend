import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first and last word", () => {
    expect(initials("Annalisa Sabatelli")).toBe("AS");
    expect(initials("Mario Rossi Bianchi")).toBe("MB");
  });

  it("uppercases and handles a single word", () => {
    expect(initials("marco")).toBe("M");
  });

  it("keeps accented letters", () => {
    expect(initials("Élodie Dupont")).toBe("ÉD");
  });

  it("returns a question mark for a blank name", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
