export type ShortcutAction = "save" | "add" | "duplicate";

interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

/** Maps a keydown to an editor shortcut (Ctrl or Cmd); null when none applies or inside a dialog. */
export function matchShortcut(e: ShortcutEvent): ShortcutAction | null {
  if (!(e.ctrlKey || e.metaKey)) return null;
  if (e.target instanceof Element && e.target.closest('[role="dialog"]')) return null;
  const key = e.key.toLowerCase();
  if (key === "s" && !e.shiftKey) return "save";
  if (e.key === "Enter" && !e.shiftKey) return "add";
  if (key === "d" && e.shiftKey) return "duplicate";
  return null;
}
