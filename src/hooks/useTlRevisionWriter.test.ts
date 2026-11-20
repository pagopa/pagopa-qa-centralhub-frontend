import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
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
    mocks.updateScenario.mockReset();
    mocks.updateScenario
      .mockRejectedValueOnce(new ApiError(409, { detail: { code: "stale_lock" } }))
      .mockResolvedValue({ id: "sc1", errors: [] });
    const { result } = renderHook(() => useTlRevisionWriter("f1", REV, "r1:draft:0"));
    await expect(result.current.updateScenario("sc1", { title: "a" })).rejects.toBeInstanceOf(ApiError);
    await result.current.updateScenario("sc1", { title: "b" });
    expect(mocks.updateScenario.mock.calls.map((c) => c[0].lock_version)).toEqual([5, 5]);
  });
});
