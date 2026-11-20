import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  apiErrorCode,
  apiErrorReasons,
  FEATURE_STATUS_LABEL,
  isStaleLockError,
  transitionBlockReasons,
  TRANSITION_LABEL,
} from "@/lib/test-lifecycle";
import type { TransitionCheck } from "@/types/test-lifecycle";

describe("isStaleLockError", () => {
  it("is true for 409 stale_lock", () => {
    expect(isStaleLockError(new ApiError(409, { detail: { code: "stale_lock" } }))).toBe(true);
  });
  it("is false for other 409 codes, other statuses and non-ApiError", () => {
    expect(isStaleLockError(new ApiError(409, { detail: { code: "revision_locked" } }))).toBe(false);
    expect(isStaleLockError(new ApiError(403, { detail: { code: "stale_lock" } }))).toBe(false);
    expect(isStaleLockError(new ApiError(409, null))).toBe(false);
    expect(isStaleLockError(new ApiError(409, { detail: "stale_lock" }))).toBe(false);
    expect(isStaleLockError(new Error("stale_lock"))).toBe(false);
    expect(isStaleLockError(undefined)).toBe(false);
  });
});

describe("apiErrorCode / apiErrorReasons", () => {
  const err = new ApiError(409, { detail: { code: "transition_not_allowed", reasons: ["a", "b"] } });
  it("extracts code and reasons", () => {
    expect(apiErrorCode(err)).toBe("transition_not_allowed");
    expect(apiErrorReasons(err)).toEqual(["a", "b"]);
  });
  it("returns null / empty for unrelated errors", () => {
    expect(apiErrorCode(new Error("x"))).toBeNull();
    expect(apiErrorCode(new ApiError(500, null))).toBeNull();
    expect(apiErrorReasons(new ApiError(409, { detail: { code: "stale_lock" } }))).toEqual([]);
  });
});

describe("transitionBlockReasons", () => {
  const checks: TransitionCheck[] = [
    { action: "submit", allowed: false, reasons: ["Serve almeno uno scenario"] },
    { action: "approve", allowed: true, reasons: [] },
  ];
  it("returns reasons for a blocked action", () => {
    expect(transitionBlockReasons(checks, "submit")).toEqual(["Serve almeno uno scenario"]);
  });
  it("returns empty for allowed, missing action or missing checks", () => {
    expect(transitionBlockReasons(checks, "approve")).toEqual([]);
    expect(transitionBlockReasons(checks, "reopen")).toEqual([]);
    expect(transitionBlockReasons(undefined, "submit")).toEqual([]);
  });
});

describe("labels", () => {
  it("uses italian labels", () => {
    expect(FEATURE_STATUS_LABEL.draft).toBe("Bozza");
    expect(FEATURE_STATUS_LABEL.running).toBe("In esecuzione");
    expect(TRANSITION_LABEL.request_changes).toBe("Richiedi modifiche");
  });
});

describe("safeHttpUrl", () => {
  it("accepts only http(s) links", async () => {
    const { safeHttpUrl } = await import("@/lib/test-lifecycle");
    expect(safeHttpUrl("https://example.org/req")).toBe("https://example.org/req");
    expect(safeHttpUrl("HTTP://example.org")).toBe("HTTP://example.org");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("www.example.org")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
