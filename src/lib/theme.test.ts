import { describe, expect, it } from "vitest";
import { withTheme } from "./theme";

describe("withTheme", () => {
  it.each([
    ["https://g.example.com/d/x?theme=light&orgId=1&kiosk", "dark", "https://g.example.com/d/x?theme=dark&orgId=1&kiosk"],
    ["https://g.example.com/d/x?orgId=1&theme=dark", "light", "https://g.example.com/d/x?orgId=1&theme=light"],
    ["https://g.example.com/d/x?orgId=1&kiosk", "dark", "https://g.example.com/d/x?orgId=1&kiosk&theme=dark"],
    ["https://g.example.com/d/x", "dark", "https://g.example.com/d/x?theme=dark"],
    ["https://g.example.com/d/x?orgId=1#panel", "light", "https://g.example.com/d/x?orgId=1&theme=light#panel"],
    ["https://g.example.com/d/x?orgId=1&mytheme=blue", "dark", "https://g.example.com/d/x?orgId=1&mytheme=blue&theme=dark"],
  ])("sets the theme of %s", (url, theme, expected) => {
    expect(withTheme(url, theme as "light" | "dark")).toBe(expected);
  });

  it("leaves an empty url alone", () => {
    expect(withTheme("", "dark")).toBe("");
  });
});
