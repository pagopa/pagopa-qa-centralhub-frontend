import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDraftSave } from "./useDraftSave";

const diff = (saved: { t: string }, next: { t: string }) => (saved.t === next.t ? {} : { t: next.t });

describe("useDraftSave dirty checker", () => {
  it("is true only while the draft differs from the saved one", async () => {
    let dirty: (() => boolean) | undefined;
    const registerFlush = vi.fn((_fn: unknown, isDirty?: () => boolean) => {
      dirty = isDirty;
      return () => {};
    });
    const persist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDraftSave({ initial: { t: "a" }, diff, persist, disabled: false, registerFlush }),
    );
    expect(dirty?.()).toBe(false);
    act(() => result.current.setDraft({ t: "b" }));
    expect(dirty?.()).toBe(true);
    await act(async () => {
      await result.current.save();
    });
    expect(dirty?.()).toBe(false);
  });

  it("stays dirty while disabled (stale) so typed text still triggers the leave warning", () => {
    let dirty: (() => boolean) | undefined;
    const registerFlush = vi.fn((_fn: unknown, isDirty?: () => boolean) => {
      dirty = isDirty;
      return () => {};
    });
    const { result } = renderHook(() =>
      useDraftSave({ initial: { t: "a" }, diff, persist: vi.fn(), disabled: true, registerFlush }),
    );
    act(() => result.current.setDraft({ t: "b" }));
    expect(dirty?.()).toBe(true);
  });
});
