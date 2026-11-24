import type { TlSaveState } from "@/lib/test-lifecycle";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Header status of the draft saves: saving, failed (until the next success) or last save time. */
export function SaveIndicator({ state }: { state: TlSaveState }) {
  let text = "";
  let color = "var(--text-muted)";
  if (state.phase === "saving") text = "Salvataggio…";
  else if (state.phase === "error") {
    text = "Errore di salvataggio";
    color = "var(--danger)";
  } else if (state.savedAt !== null) text = `Salvato alle ${formatTime(state.savedAt)}`;
  return (
    <span
      role="status"
      aria-live="polite"
      title={state.phase === "error" ? (state.error ?? undefined) : undefined}
      className="font-mono text-[12px]"
      style={{ color }}
    >
      {text}
    </span>
  );
}
