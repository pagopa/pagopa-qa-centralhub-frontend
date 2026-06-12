"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function DqInfoPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-text-dim hover:bg-hover transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Data Quality Framework
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 flex flex-col gap-3">
          <p className="text-[13px] text-text-dim">
            Il framework di Data Quality si articola in due livelli: il <strong>Catalogo Controlli</strong> definisce
            i controlli applicabili (Puntuali, Intra-entità, Cross-entità) classificati per dimensione DQ
            (Validità, Completezza, Consistenza, Accuratezza, Unicità, Tempestività); i <strong>Controlli per Dominio</strong>{" "}
            mappano ciascun controllo del catalogo a tabelle e campi fisici del Data Lake per ciascun data
            product (GEC, GPD, BIZ, FDR, Wallet).
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dq-architecture.svg" alt="Architettura Data Quality Framework" className="w-full max-w-2xl" />
        </div>
      )}
    </div>
  );
}
