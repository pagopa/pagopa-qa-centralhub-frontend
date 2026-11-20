import { useEffect, useRef, useState } from "react";
import { isStaleLockError, StaleDraftError, writeErrorMessage, type Flusher } from "@/lib/test-lifecycle";

/**
 * Local draft of an editable block with serialized saves.
 *
 * - Saves are chained: a save started while another is in flight waits for it
 *   and then sends only what still differs, so blur + "Salva" never duplicate.
 * - The draft is seeded once; a failed save never discards local text.
 * - Stale-lock errors are left to the page-wide stale state (no inline message).
 * - With `registerFlush`, the block registers itself so pending edits are
 *   saved before a workflow transition runs.
 */
export function useDraftSave<D, P extends object>({
  initial,
  diff,
  persist,
  onSaved,
  disabled,
  registerFlush,
}: {
  initial: D;
  diff: (saved: D, next: D) => P;
  persist: (patch: P) => Promise<unknown>;
  onSaved?: (result: unknown) => void;
  /** Read-only or stale: nothing is sent. */
  disabled: boolean;
  registerFlush?: (fn: Flusher) => () => void;
}) {
  const [draft, setDraftState] = useState<D>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const saved = useRef(initial);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const latest = useRef({ diff, persist, onSaved, disabled });
  useEffect(() => {
    latest.current = { diff, persist, onSaved, disabled };
  });

  const setDraft = (next: D) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const doSave = async (): Promise<boolean> => {
    const { diff: d, persist: p, onSaved: done, disabled: off } = latest.current;
    if (off) return true;
    const next = draftRef.current;
    const patch = d(saved.current, next);
    if (Object.keys(patch).length === 0) return true;
    setSaving(true);
    setError(null);
    try {
      const result = await p(patch);
      saved.current = next;
      done?.(result);
      return true;
    } catch (err) {
      if (!isStaleLockError(err) && !(err instanceof StaleDraftError)) setError(writeErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = (): Promise<boolean> => {
    const run = chain.current.then(doSave, doSave);
    chain.current = run;
    return run;
  };

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    if (!registerFlush) return;
    return registerFlush(() => saveRef.current());
  }, [registerFlush]);

  return { draft, setDraft, save, saving, error, setError };
}
