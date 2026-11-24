import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useUnsavedGuard } from "./useUnsavedGuard";

function fireBeforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedGuard", () => {
  it("prevents unload only when hasUnsaved returns true", () => {
    let unsaved = true;
    const { unmount } = renderHook(() => useUnsavedGuard(() => unsaved));
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
    unsaved = false;
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
    unmount();
    unsaved = true;
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
