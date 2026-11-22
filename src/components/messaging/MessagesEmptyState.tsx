import { Check } from "lucide-react";

export function MessagesEmptyState({ filtered = false }: { filtered?: boolean }) {
  return (
    <div
      style={{
        marginTop: 22,
        padding: 30,
        textAlign: "center",
        color: "var(--text-dim)",
        background: "var(--surface)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "var(--success-soft)",
          color: "var(--success)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 10px",
        }}
      >
        <Check size={26} strokeWidth={2} aria-hidden />
      </div>
      <b style={{ color: "var(--text)" }}>Nessun messaggio</b>
      <div style={{ marginTop: 2, fontSize: 14 }}>
        {filtered
          ? "Nessun messaggio corrisponde ai filtri selezionati."
          : "Quando ci sarà qualcosa da attenzionare lo troverai qui."}
      </div>
    </div>
  );
}
