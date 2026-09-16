import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncSanpHealth } from "@/hooks/useSanpHealth";

const tanstack = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn((options) => options),
  useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: tanstack.useMutation,
  useQuery: vi.fn(),
  useQueryClient: tanstack.useQueryClient,
}));

vi.mock("@/lib/api", () => ({ apiClient: vi.fn() }));

describe("useSyncSanpHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tanstack.useQueryClient.mockReturnValue({ invalidateQueries: tanstack.invalidateQueries });
  });

  it("refreshes sync status when the mutation settles after an error", async () => {
    const mutation = useSyncSanpHealth() as unknown as {
      onSettled?: () => Promise<void> | void;
    };

    await mutation.onSettled?.();

    expect(tanstack.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["sanp-health", "sync-status"],
    });
  });
});