import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { StaleDraftError } from "@/lib/test-lifecycle";
import type { TlRevision } from "@/types/test-lifecycle";
import { useTlRevisionWriter } from "./useTlRevisionWriter";

const mocks = vi.hoisted(() => ({
  updateRevision: vi.fn(),
  updateScenario: vi.fn(),
  addScenario: vi.fn(),
  removeScenario: vi.fn(),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useUpdateTlRevision: () => ({ mutateAsync: mocks.updateRevision }),
  useUpdateTlScenario: () => ({ mutateAsync: mocks.updateScenario }),
  useAddTlScenario: () => ({ mutateAsync: mocks.addScenario }),
  useRemoveTlScenario: () => ({ mutateAsync: mocks.removeScenario }),
}));

const REV = { id: "r1", lock_version: 5, status: "draft" } as TlRevision;

describe("useTlRevisionWriter", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) m.mockReset();
  });

  it("advances the lock after each successful write so consecutive saves work", async () => {
    mocks.updateScenario.mockResolvedValue({ id: "sc1", errors: [] });
    mocks.updateRevision.mockImplementation(async (v: { lock_version: number }) => ({
      ...REV, lock_version: v.lock_version + 1,
    }));
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));

    await Promise.all([
      result.current.updateScenario("sc1", { title: "a" }),
      result.current.updateScenario("sc1", { title: "b" }),
    ]);
    await result.current.updateRevision({ title: "t" });
    await result.current.updateScenario("sc1", { steps: "Dato x" });

    const locks = [
      ...mocks.updateScenario.mock.calls.map((c) => c[0].lock_version),
    ];
    expect(locks).toEqual([5, 6, 8]);
    expect(mocks.updateRevision.mock.calls[0][0].lock_version).toBe(7);
  });

  it("does not advance the lock after a stale_lock error", async () => {
    mocks.updateScenario
      .mockRejectedValueOnce(new ApiError(409, { detail: { code: "stale_lock" } }))
      .mockResolvedValue({ id: "sc1", errors: [] });
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await expect(result.current.updateScenario("sc1", { title: "a" })).rejects.toBeInstanceOf(ApiError);
    });
    // Further writes are refused until reload…
    await expect(result.current.updateScenario("sc1", { title: "b" })).rejects.toBeInstanceOf(StaleDraftError);
    act(() => result.current.clearStale());
    await result.current.updateScenario("sc1", { title: "b" });
    expect(mocks.updateScenario.mock.calls.map((c) => c[0].lock_version)).toEqual([5, 5]);
  });

  it("advances by one after a DELETE whose lock matches", async () => {
    mocks.removeScenario.mockResolvedValue({ ...REV, lock_version: 6 });
    mocks.updateScenario.mockResolvedValue({ id: "sc2", errors: [] });
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await result.current.removeScenario("sc1");
    await result.current.updateScenario("sc2", { title: "a" });
    expect(mocks.updateScenario.mock.calls[0][0].lock_version).toBe(6);
    expect(result.current.stale).toBe(false);
  });

  it("flags stale (and does not adopt the lock) when DELETE reveals a concurrent edit", async () => {
    mocks.removeScenario.mockResolvedValue({ ...REV, lock_version: 9 });
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await result.current.removeScenario("sc1");
    });
    expect(result.current.stale).toBe(true);
    await expect(result.current.updateScenario("sc2", { title: "a" })).rejects.toBeInstanceOf(StaleDraftError);
    await expect(result.current.removeScenario("sc2")).rejects.toBeInstanceOf(StaleDraftError);
    expect(mocks.updateScenario).not.toHaveBeenCalled();
    expect(mocks.removeScenario).toHaveBeenCalledTimes(1);
  });

  it("raises the page-wide stale state on stale_lock and clears it on reload", async () => {
    mocks.updateRevision.mockRejectedValue(new ApiError(409, { detail: { code: "stale_lock" } }));
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await result.current.updateRevision({ title: "t" }).catch(() => undefined);
    });
    expect(result.current.stale).toBe(true);
    act(() => result.current.clearStale());
    expect(result.current.stale).toBe(false);
  });

  it("runs a transition only after pending flushes and in-flight saves", async () => {
    const order: string[] = [];
    let finishSave: () => void = () => {};
    mocks.updateScenario.mockImplementation(
      () => new Promise((r) => (finishSave = () => { order.push("save"); r({ id: "sc1", errors: [] }); })),
    );
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    // A blur started a save that is still in flight…
    void result.current.updateScenario("sc1", { title: "a" });
    // …and a dirty block flushes its own edit when asked.
    const flush = vi.fn(async () => {
      await result.current.updateRevision({ title: "t" }).then(() => order.push("flush"));
      return true;
    });
    mocks.updateRevision.mockResolvedValue({ ...REV, lock_version: 7 });
    result.current.registerFlush(flush);

    const transition = vi.fn(async () => order.push("transition"));
    const done = result.current.afterPendingWrites(transition);
    await Promise.resolve();
    expect(transition).not.toHaveBeenCalled();
    finishSave();
    await done;
    expect(order).toEqual(["save", "flush", "transition"]);
  });

  it("does not run the transition when a flush fails", async () => {
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    result.current.registerFlush(async () => false);
    const transition = vi.fn();
    await expect(result.current.afterPendingWrites(transition)).rejects.toThrow("flush_failed");
    expect(transition).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.stale).toBe(false));
  });

  it("saveState goes saving then idle with savedAt after a write", async () => {
    let release!: () => void;
    mocks.updateScenario.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ id: "sc1", errors: [] }); }),
    );
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    expect(result.current.saveState).toEqual({ phase: "idle", savedAt: null, error: null });
    let p!: Promise<unknown>;
    act(() => { p = result.current.updateScenario("sc1", { title: "a" }); });
    await waitFor(() => expect(result.current.saveState.phase).toBe("saving"));
    await act(async () => { release(); await p; });
    expect(result.current.saveState.phase).toBe("idle");
    expect(result.current.saveState.savedAt).toEqual(expect.any(Number));
  });

  it("saveState is error after a failed write and clears after the next success", async () => {
    mocks.updateScenario
      .mockRejectedValueOnce(new ApiError(500, { detail: "boom" }))
      .mockResolvedValue({ id: "sc1", errors: [] });
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await expect(result.current.updateScenario("sc1", { title: "a" })).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.saveState.phase).toBe("error");
    expect(result.current.saveState.error).toEqual(expect.any(String));
    await act(async () => { await result.current.updateScenario("sc1", { title: "b" }); });
    expect(result.current.saveState.phase).toBe("idle");
    expect(result.current.saveState.error).toBeNull();
  });

  it("hasUnsaved reflects registered dirty checkers", () => {
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    expect(result.current.hasUnsaved()).toBe(false);
    let dirty = true;
    act(() => { result.current.registerFlush(async () => true, () => dirty); });
    expect(result.current.hasUnsaved()).toBe(true);
    dirty = false;
    expect(result.current.hasUnsaved()).toBe(false);
  });

  it("saveAll resolves false when a flusher fails", async () => {
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    act(() => {
      result.current.registerFlush(async () => true);
      result.current.registerFlush(async () => false);
    });
    await expect(result.current.saveAll()).resolves.toBe(false);
  });

  it("a failed transition (afterPendingWrites) does not count as a save error", async () => {
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await expect(
        result.current.afterPendingWrites(() => Promise.reject(new ApiError(422, { detail: "no" }))),
      ).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.saveState.phase).toBe("idle");
    expect(result.current.hasUnsaved()).toBe(false);
  });

  it("a failed silent scenario write (reorder/duplicate) does not count as a save error", async () => {
    mocks.updateScenario.mockRejectedValue(new ApiError(500, { detail: "boom" }));
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await expect(result.current.updateScenario("sc1", { position: 2 }, { silent: true })).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.saveState.phase).toBe("idle");
  });

  it("hasUnsaved ignores a past save failure once nothing is dirty, and clearStale resets the error", async () => {
    mocks.updateScenario.mockRejectedValueOnce(new ApiError(500, { detail: "boom" }));
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await act(async () => {
      await expect(result.current.updateScenario("sc1", { title: "a" })).rejects.toBeInstanceOf(ApiError);
    });
    expect(result.current.saveState.phase).toBe("error");
    expect(result.current.hasUnsaved()).toBe(false);
    act(() => result.current.clearStale());
    expect(result.current.saveState.phase).toBe("idle");
  });
});
