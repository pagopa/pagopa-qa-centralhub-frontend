import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAddTlScenario,
  useRemoveTlScenario,
  useUpdateTlRevision,
  useUpdateTlScenario,
} from "@/hooks/useTestLifecycle";
import {
  isStaleLockError,
  StaleDraftError,
  writeErrorMessage,
  type Flusher,
  type RegisterFlush,
  type TlSaveState,
} from "@/lib/test-lifecycle";
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
 * local lock is advanced after each one; consecutive saves therefore work
 * without waiting for a refetch.
 *
 * The local lock is (re)seeded from the server only when `syncKey` changes
 * (revision id/status, or an explicit reload). Background refetches never
 * overwrite it, so a concurrent edit by someone else surfaces as stale_lock
 * instead of being silently overwritten.
 *
 * `stale` is page-wide: once any write hits stale_lock (or a lock mismatch is
 * detected), every further write is refused until `clearStale()` (Ricarica).
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

  // Save state shown in the header; refs mirror it for the beforeunload check.
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [lastError, setLastErrorState] = useState<string | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const setLastError = (message: string | null) => {
    lastErrorRef.current = message;
    setLastErrorState(message);
  };

  const [stale, setStaleState] = useState(false);
  const staleRef = useRef(false);
  const markStale = useCallback(() => {
    staleRef.current = true;
    setStaleState(true);
  }, []);
  const clearStale = useCallback(() => {
    staleRef.current = false;
    setStaleState(false);
    setLastError(null);
  }, []);

  const server = useRef({ key: syncKey, lock: revision?.lock_version ?? 0 });
  useEffect(() => {
    server.current = { key: syncKey, lock: revision?.lock_version ?? 0 };
  });
  const local = useRef<{ key: string; lock: number } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const flushers = useRef(new Set<Flusher>());
  const dirtyCheckers = useRef(new Map<Flusher, () => boolean>());


  const currentLock = () => {
    if (!local.current || local.current.key !== server.current.key) {
      local.current = { ...server.current };
    }
    return local.current.lock;
  };
  const setLock = (lock: number) => {
    if (local.current) local.current.lock = lock;
  };

  /** Runs `fn` after every previously queued write has settled; refuses when stale. */
  /** `track`: draft saves only; their failure shows in the header (transitions, reorders... do not). */
  function enqueue<T>(fn: () => Promise<T>, track = false): Promise<T> {
    const guarded = async () => {
      if (staleRef.current) throw new StaleDraftError();
      try {
        const result = await fn();
        if (track) {
          setSavedAt(Date.now());
          setLastError(null);
        }
        return result;
      } catch (err) {
        if (isStaleLockError(err)) markStale();
        else if (track) setLastError(writeErrorMessage(err));
        throw err;
      }
    };
    pendingRef.current += 1;
    setPending(pendingRef.current);
    const run = queue.current.then(guarded, guarded);
    queue.current = run.catch(() => undefined);
    const done = () => {
      pendingRef.current -= 1;
      setPending(pendingRef.current);
    };
    run.then(done, done);
    return run;
  }

  const registerFlush = useCallback<RegisterFlush>((fn, isDirty) => {
    flushers.current.add(fn);
    if (isDirty) dirtyCheckers.current.set(fn, isDirty);
    return () => {
      flushers.current.delete(fn);
      dirtyCheckers.current.delete(fn);
    };
  }, []);

  /** Saves every registered draft; false when any flush failed. */
  async function saveAll(): Promise<boolean> {
    const results = await Promise.all([...flushers.current].map((f) => f()));
    return !results.includes(false);
  }

  /** Anything not safely on the server: writes in flight or a dirty draft (a failed save keeps it dirty). */
  const hasUnsaved = () =>
    pendingRef.current > 0 || [...dirtyCheckers.current.values()].some((isDirty) => isDirty());

  const saveState: TlSaveState = {
    phase: pending > 0 ? "saving" : lastError !== null ? "error" : "idle",
    savedAt,
    error: lastError,
  };

  /**
   * Saves every registered dirty draft, then runs `fn` (e.g. a workflow
   * transition) after all queued writes. Rejects without running `fn` when a
   * flush failed or the draft is stale, so a transition never races a save.
   */
  async function afterPendingWrites<T>(fn: () => Promise<T>): Promise<T> {
    const results = await Promise.all([...flushers.current].map((f) => f()));
    if (results.includes(false)) throw new Error("flush_failed");
    return enqueue(fn);
  }

  const revisionId = revision?.id ?? "";

  return {
    stale,
    clearStale,
    registerFlush,
    saveAll,
    hasUnsaved,
    saveState,
    afterPendingWrites,
    /** Lock version the next write will send (use inside afterPendingWrites). */
    currentLock,
    updateRevision: (patch: RevisionPatch) =>
      enqueue(async (): Promise<TlRevision> => {
        const res = await updateRevision.mutateAsync({
          featureId, revisionId, ...patch, lock_version: currentLock(),
        });
        setLock(res.lock_version);
        return res;
      }, true),
    updateScenario: (scenarioId: string, patch: ScenarioPatch, opts: { silent?: boolean } = {}) =>
      enqueue(async (): Promise<TlScenario> => {
        const lock = currentLock();
        const res = await updateScenario.mutateAsync({
          featureId, revisionId, scenarioId, ...patch, lock_version: lock,
        });
        // The scenario response carries no lock: the server checked ours and bumped it by one.
        setLock(lock + 1);
        return res;
      }, !opts.silent),
    addScenario: (data: TlScenarioCreate) =>
      enqueue(async (): Promise<TlScenario> => {
        const lock = currentLock();
        const res = await addScenario.mutateAsync({ featureId, revisionId, ...data });
        // Adding does not check the lock server-side but bumps it by one. We advance
        // ours by exactly one (never adopt a server value): if someone else wrote in
        // between, our lock stays behind and the next locked write reports stale_lock.
        setLock(lock + 1);
        return res;
      }),
    removeScenario: (scenarioId: string) =>
      enqueue(async (): Promise<TlRevision> => {
        const lock = currentLock();
        const res = await removeScenario.mutateAsync({ featureId, revisionId, scenarioId });
        // DELETE does not check the lock either. The response tells us the server
        // lock: anything but ours + 1 means a concurrent edit happened, so we do not
        // adopt it (that would mask the conflict) and flag the draft as stale.
        if (res.lock_version !== lock + 1) markStale();
        else setLock(lock + 1);
        return res;
      }),
  };
}

export type TlRevisionWriter = ReturnType<typeof useTlRevisionWriter>;
