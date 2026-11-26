import { useEffect, useRef, useState } from "react";
import { isStaleLockError, StaleDraftError, writeErrorMessage, type RegisterFlush } from "@/lib/test-lifecycle";

/**
 * Local draft of an editable block with serialized saves.
 *
 * - Saves are chained: a save started while another is in flight waits for it
 *   and then sends only what still differs, so blur + "Salva" never duplicate.
 * - The draft is seeded once; a failed save never discards local text.
 * - Stale-lock errors are left to the page-wide stale state (no inline message).
 * - With `registerFlush`, the block registers itself so pending edits are
 *   saved before a workflow transition runs; it also registers a dirty checker
 *   (draft differs from the saved one, or a save is in flight).
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
  registerFlush?: RegisterFlush;
}) {
  const [draft, setDraftState] = useState<D>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const savingRef = useRef(false);
  const saved = useRef(initial);
  // the saved draft as state too, so `dirty` is a pure function of what is rendered
  const [savedState, setSavedState] = useState<D>(initial);
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
    savingRef.current = true;
    setError(null);
    try {
      const result = await p(patch);
      saved.current = next;
      setSavedState(next);
      done?.(result);
      return true;
    } catch (err) {
      if (!isStaleLockError(err) && !(err instanceof StaleDraftError)) setError(writeErrorMessage(err));
      return false;
    } finally {
      savingRef.current = false;
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
    // Stale drafts count too: their typed text is exactly what a reload would lose.
    const isDirty = () =>
      savingRef.current || Object.keys(latest.current.diff(saved.current, draftRef.current)).length > 0;
    return registerFlush(() => saveRef.current(), isDirty);
  }, [registerFlush]);

  /** The draft differs from the last saved one (also while that save is in flight). */
  const dirty = Object.keys(diff(savedState, draft)).length > 0;

  return { draft, setDraft, save, saving, error, setError, dirty };
}
