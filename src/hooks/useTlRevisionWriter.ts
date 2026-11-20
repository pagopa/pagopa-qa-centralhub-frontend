import { useEffect, useRef } from "react";
import {
  useAddTlScenario,
  useRemoveTlScenario,
  useUpdateTlRevision,
  useUpdateTlScenario,
} from "@/hooks/useTestLifecycle";
import type {
  TlRevision,
  TlRevisionUpdate,
  TlScenario,
  TlScenarioCreate,
  TlScenarioUpdate,
} from "@/types/test-lifecycle";

type RevisionPatch = Omit<TlRevisionUpdate, "lock_version">;
type ScenarioPatch = Omit<TlScenarioUpdate, "lock_version">;

/**
 * Writes to one revision with optimistic locking. Every write bumps the
 * revision `lock_version` on the server, so writes are serialized and the
 * local lock is advanced from each response; consecutive saves therefore work
 * without waiting for a refetch.
 *
 * The local lock is (re)seeded from the server only when `syncKey` changes
 * (revision id/status, or an explicit reload). Background refetches never
 * overwrite it, so a concurrent edit by someone else surfaces as stale_lock
 * instead of being silently overwritten.
 */
export function useTlRevisionWriter(
  featureId: string,
  revision: TlRevision | null,
  syncKey: string,
) {
  const updateRevision = useUpdateTlRevision();
  const addScenario = useAddTlScenario();
  const updateScenario = useUpdateTlScenario();
  const removeScenario = useRemoveTlScenario();

  const server = useRef({ key: syncKey, lock: revision?.lock_version ?? 0 });
  useEffect(() => {
    server.current = { key: syncKey, lock: revision?.lock_version ?? 0 };
  });
  const local = useRef<{ key: string; lock: number } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const currentLock = () => {
    if (!local.current || local.current.key !== server.current.key) {
      local.current = { ...server.current };
    }
    return local.current.lock;
  };
  const setLock = (lock: number) => {
    if (local.current) local.current.lock = lock;
  };

  /** Runs `fn` after every previously queued write has settled. */
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.current.then(fn, fn);
    queue.current = run.catch(() => undefined);
    return run;
  }

  const revisionId = revision?.id ?? "";

  return {
    updateRevision: (patch: RevisionPatch) =>
      enqueue(async (): Promise<TlRevision> => {
        const res = await updateRevision.mutateAsync({
          featureId, revisionId, ...patch, lock_version: currentLock(),
        });
        setLock(res.lock_version);
        return res;
      }),
    updateScenario: (scenarioId: string, patch: ScenarioPatch) =>
      enqueue(async (): Promise<TlScenario> => {
        const lock = currentLock();
        const res = await updateScenario.mutateAsync({
          featureId, revisionId, scenarioId, ...patch, lock_version: lock,
        });
        // The scenario response carries no lock: the server bumped it by one.
        setLock(lock + 1);
        return res;
      }),
    addScenario: (data: TlScenarioCreate) =>
      enqueue(async (): Promise<TlScenario> => {
        const lock = currentLock();
        const res = await addScenario.mutateAsync({ featureId, revisionId, ...data });
        setLock(lock + 1);
        return res;
      }),
    removeScenario: (scenarioId: string) =>
      enqueue(async (): Promise<TlRevision> => {
        currentLock();
        const res = await removeScenario.mutateAsync({ featureId, revisionId, scenarioId });
        setLock(res.lock_version);
        return res;
      }),
  };
}
