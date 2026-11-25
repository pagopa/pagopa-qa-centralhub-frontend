import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import {
  apiErrorCode,
  apiErrorReasons,
  FEATURE_STATUS_LABEL,
  isStaleLockError,
  lineDiff,
  tlEventLabel,
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

describe("writeErrorMessage", () => {
  it("surfaces the first pydantic 422 message", async () => {
    const { writeErrorMessage } = await import("@/lib/test-lifecycle");
    const err = new ApiError(422, {
      detail: [{ loc: ["body", "description"], msg: "Value error, La descrizione non può contenere righe che iniziano con @", type: "value_error" }],
    });
    expect(writeErrorMessage(err)).toBe("La descrizione non può contenere righe che iniziano con @");
  });

  it("falls back to a generic message", async () => {
    const { writeErrorMessage } = await import("@/lib/test-lifecycle");
    expect(writeErrorMessage(new ApiError(500, null))).toBe("Salvataggio non riuscito.");
    expect(writeErrorMessage(new ApiError(409, { detail: { code: "revision_locked" } }))).toMatch(/non è più in bozza/);
  });
});

describe("lineDiff", () => {
  it("marks identical text as unchanged", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([
      { type: "same", text: "a" },
      { type: "same", text: "b" },
    ]);
  });

  it("detects added lines", () => {
    expect(lineDiff("a\nc", "a\nb\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "add", text: "b" },
      { type: "same", text: "c" },
    ]);
  });

  it("detects removed lines", () => {
    expect(lineDiff("a\nb\nc", "a\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "del", text: "b" },
      { type: "same", text: "c" },
    ]);
  });

  it("emits deletions before additions for a changed line", () => {
    expect(lineDiff("a\nx\nc", "a\ny\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "del", text: "x" },
      { type: "add", text: "y" },
      { type: "same", text: "c" },
    ]);
  });

  it("keeps a trailing newline as a final empty line", () => {
    expect(lineDiff("a\n", "a\nb\n")).toEqual([
      { type: "same", text: "a" },
      { type: "add", text: "b" },
      { type: "same", text: "" },
    ]);
  });

  it("handles repeated lines", () => {
    expect(lineDiff("a\na\nb", "a\nb\nb")).toEqual([
      { type: "same", text: "a" },
      { type: "del", text: "a" },
      { type: "same", text: "b" },
      { type: "add", text: "b" },
    ]);
  });

  it("handles empty sides", () => {
    expect(lineDiff("", "a")).toEqual([{ type: "add", text: "a" }]);
    expect(lineDiff("a", "")).toEqual([{ type: "del", text: "a" }]);
  });
});

describe("tlEventLabel", () => {
  it("translates known actions and falls back to the raw key", () => {
    expect(tlEventLabel("tl.revision.submitted")).toBe("Revisione inviata in review");
    expect(tlEventLabel("tl.unknown.thing")).toBe("tl.unknown.thing");
    expect(tlEventLabel(null)).toBe("Evento");
  });

  it("labels the going-back events instead of showing the raw key", () => {
    expect(tlEventLabel("tl.revision.approval_withdrawn")).toBe("Approvazione ritirata");
    expect(tlEventLabel("tl.revision.withdrawn")).toBe("Revisione ritirata in bozza");
  });
});

describe("git labels", () => {
  it("labels issue kinds, statuses, PR states and new events in Italian", async () => {
    const lib = await import("@/lib/test-lifecycle");
    expect(lib.ISSUE_KIND_LABEL.structural_change).toBe("Modifica strutturale");
    expect(lib.ISSUE_KIND_LABEL.pr_creation_failed).toBe("Creazione PR fallita");
    expect(lib.ISSUE_STATUS_LABEL.acknowledged).toBe("Presa visione");
    expect(lib.PR_STATE_LABEL.merged).toBe("Integrata");
    expect(lib.tlEventLabel("tl.pr.created")).toBe("PR aperta");
    expect(lib.tlEventLabel("tl.revision.rebased")).toBe("Bozza riallineata");
  });
});
