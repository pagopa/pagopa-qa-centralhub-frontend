import { describe, expect, it } from "vitest";
import { docShareUrl, safeCallbackUrl } from "./doc-link";

describe("docShareUrl", () => {
  it("points the hub docs section at the item", () => {
    expect(docShareUrl("https://hub.example.org", "abc-123")).toBe(
      "https://hub.example.org/docs?item=abc-123",
    );
  });

  it("encodes ids that are not url safe", () => {
    expect(docShareUrl("http://localhost:3000", "a b&c")).toBe(
      "http://localhost:3000/docs?item=a%20b%26c",
    );
  });
});

describe("safeCallbackUrl", () => {
  it("keeps an in-app path with its query", () => {
    expect(safeCallbackUrl("/docs?item=abc")).toBe("/docs?item=abc");
  });

  it.each([null, undefined, "", "docs", "https://evil.example", "//evil.example", "/\\evil.example"])(
    "falls back to the home for %s",
    (raw) => {
      expect(safeCallbackUrl(raw)).toBe("/");
    },
  );
});
