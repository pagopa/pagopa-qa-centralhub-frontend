import { describe, expect, it } from "vitest";
import { matchShortcut } from "./shortcuts";

const ev = (over: Partial<Parameters<typeof matchShortcut>[0]>) => ({
  key: "", ctrlKey: false, metaKey: false, shiftKey: false, target: null, ...over,
});

describe("matchShortcut", () => {
  it("recognises save, add and duplicate with ctrl or meta", () => {
    expect(matchShortcut(ev({ key: "s", ctrlKey: true }))).toBe("save");
    expect(matchShortcut(ev({ key: "s", metaKey: true }))).toBe("save");
    expect(matchShortcut(ev({ key: "Enter", ctrlKey: true }))).toBe("add");
    expect(matchShortcut(ev({ key: "D", ctrlKey: true, shiftKey: true }))).toBe("duplicate");
    expect(matchShortcut(ev({ key: "d", metaKey: true, shiftKey: true }))).toBe("duplicate");
  });

  it("ignores plain keys and shift+s", () => {
    expect(matchShortcut(ev({ key: "s" }))).toBeNull();
    expect(matchShortcut(ev({ key: "Enter" }))).toBeNull();
    expect(matchShortcut(ev({ key: "S", ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(matchShortcut(ev({ key: "d", ctrlKey: true }))).toBeNull();
  });

  it("returns null inside a dialog", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const input = document.createElement("textarea");
    dialog.appendChild(input);
    document.body.appendChild(dialog);
    expect(matchShortcut(ev({ key: "s", ctrlKey: true, target: input }))).toBeNull();
    dialog.remove();
  });
});
