import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlowPending } from "./useSlowPending";

describe("useSlowPending", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("is false at first and turns true only after the delay of a continuous wait", () => {
    const { result } = renderHook(({ active }) => useSlowPending(active, 400), {
      initialProps: { active: true },
    });
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it("never turns on for a quick operation", () => {
    const { result, rerender } = renderHook(({ active }) => useSlowPending(active, 400), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(200));
    rerender({ active: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("turns off at once when the work ends and starts counting again next time", () => {
    const { result, rerender } = renderHook(({ active }) => useSlowPending(active, 400), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(true);
    rerender({ active: false });
    expect(result.current).toBe(false);
    rerender({ active: true });
    expect(result.current).toBe(false);
  });
});
