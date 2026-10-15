"use client";

import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Gate } from "@/lib/permissions";
import { useEaNodeDetail, useEaNodeHistory, useVerifyEaEdge } from "@/hooks/useEaMap";
import type { EaGraph } from "@/lib/ea-map/graph";
import type { EaEdgeDetail, EaEdgeType, EaHistoryItem, EaNode } from "@/types/ea";
import { EDGE_TYPE_LABEL, EaEdgeDialog, EaRemoveEdgeDialog, type EdgeDraft } from "./EaEditDialogs";
import { cx } from "./shared";
import s from "./ea-map.module.css";

export const ORIGIN_LABEL: Record<string, string> = {
  helm: "dal codice",
  infra_rule: "da regola",
  curated: "curato",
  manual: "manuale",
};
const ORIGIN_HINT: Record<string, string> = {
  helm: "Ricavato dalla configurazione Helm/App Settings del repository",
  infra_rule: "Dedotto da una regola sull'infrastruttura (es. namespace, storage condiviso)",
  curated: "Inserito nella ricognizione iniziale a partire dalla documentazione",
  manual: "Aggiunto a mano da una persona dalla EA Map",
};
const TECH_TYPES = new Set(Object.keys(EDGE_TYPE_LABEL));
const VISIBLE = new Set(["active", "verified"]);

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "";

type Dialog =
  | { kind: "add"; initial?: Partial<EdgeDraft> }
  | { kind: "edit"; edge: EaEdgeDetail }
  | { kind: "remove"; edge: EaEdgeDetail }
  | null;

function EdgeRow({
  g,
  edge,
  side,
  onOpen,
  onDialog,
}: {
  g: EaGraph;
  edge: EaEdgeDetail;
  side: "to" | "from";
  onOpen: (id: string) => void;
  onDialog: (d: Dialog) => void;
}) {
  const verify = useVerifyEaEdge();
  const other = g.byId.get(edge[side]);
  const verified = edge.status === "verified";
  return (
    <li className={s.rel}>
      <div className={s.relMain}>
        <button type="button" className={s.relName} onClick={() => other && onOpen(other.id)} disabled={!other}>
          {other?.name ?? edge[side]}
        </button>
        <span className={s.pill}>{EDGE_TYPE_LABEL[edge.type as EaEdgeType] ?? edge.type}</span>
        <span className={s.pill} title={ORIGIN_HINT[edge.origin]}>
          {ORIGIN_LABEL[edge.origin] ?? edge.origin}
        </span>
        {verified ? (
          <span
            className={cx(s.pill, s.pillOk)}
            title={edge.verified_by ? `Verificato da ${edge.verified_by} il ${fmtDate(edge.verified_at)}` : "Verificato"}
          >
            ✓ verificato
          </span>
        ) : (
          <span className={cx(s.pill, s.pillWarn)} title="Rilevato automaticamente, nessuno l'ha ancora confermato">
            da verificare
          </span>
        )}
        <Gate action="edit:ea_map">
          <span className={s.relAct}>
            {!verified && (
              <button
                type="button"
                className={s.iconBtn}
                title="Conferma: il legame è corretto"
                aria-label="Conferma legame"
                disabled={verify.isPending}
                onClick={() => verify.mutate({ id: edge.id })}
              >
                <Check size={14} />
              </button>
            )}
            <button
              type="button"
              className={s.iconBtn}
              title="Correggi tipo, etichetta o nota"
              aria-label="Modifica legame"
              onClick={() => onDialog({ kind: "edit", edge })}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              className={cx(s.iconBtn, s.iconDanger)}
              title="Il legame non esiste: rimuovilo"
              aria-label="Rimuovi legame"
              onClick={() => onDialog({ kind: "remove", edge })}
            >
              <X size={14} />
            </button>
          </span>
        </Gate>
      </div>
      {(edge.label || edge.note) && (
        <div className={s.relNote}>
          {edge.label && <span className={s.mono}>{edge.label}</span>}
          {edge.label && edge.note && " · "}
          {edge.note}
        </div>
      )}
    </li>
  );
}

export function EaRelations({ g, node, onOpen }: { g: EaGraph; node: EaNode; onOpen: (id: string) => void }) {
  const { data, isLoading, isError } = useEaNodeDetail(node.id);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const close = (open: boolean) => !open && setDialog(null);

  const tech = (es: EaEdgeDetail[] = []) => es.filter((e) => TECH_TYPES.has(e.type));
  const out = tech(data?.out).filter((e) => VISIBLE.has(e.status));
  const inn = tech(data?.in).filter((e) => VISIBLE.has(e.status));
  const removed = [...tech(data?.out), ...tech(data?.in)].filter((e) => e.status === "removed");
  const toVerify = [...out, ...inn].filter((e) => e.status !== "verified").length;

  return (
    <section className={s.dbSec} aria-busy={isLoading}>
      <div className={s.secHead}>
        <h4>Relazioni</h4>
        {toVerify > 0 && <span className={s.no}>{toVerify} da verificare</span>}
        <Gate action="edit:ea_map">
          <button type="button" className={s.linkBtn} onClick={() => setDialog({ kind: "add" })}>
            <Plus size={13} /> Aggiungi legame
          </button>
        </Gate>
      </div>
      {isLoading && <span className={s.no}>Caricamento…</span>}
      {isError && <span className={s.no}>Impossibile caricare le relazioni.</span>}
      {data && out.length === 0 && inn.length === 0 && (
        <span className={s.no}>Nessuna relazione nota. Se ne conosci una, aggiungila.</span>
      )}
      {out.length > 0 && (
        <>
          <span className={s.no}>Chiama / usa</span>
          <ul className={s.rels}>
            {out.map((e) => (
              <EdgeRow key={e.id} g={g} edge={e} side="to" onOpen={onOpen} onDialog={setDialog} />
            ))}
          </ul>
        </>
      )}
      {inn.length > 0 && (
        <>
          <span className={s.no}>Usato da</span>
          <ul className={s.rels}>
            {inn.map((e) => (
              <EdgeRow key={e.id} g={g} edge={e} side="from" onOpen={onOpen} onDialog={setDialog} />
            ))}
          </ul>
        </>
      )}
      {removed.length > 0 && (
        <div>
          <button type="button" className={s.linkBtn} onClick={() => setShowRemoved((v) => !v)} aria-expanded={showRemoved}>
            {showRemoved ? "Nascondi" : "Mostra"} legami rimossi ({removed.length})
          </button>
          {showRemoved && (
            <ul className={s.rels}>
              {removed.map((e) => {
                const out = e.from === node.id;
                const otherId = out ? e.to : e.from;
                return (
                  <li key={e.id} className={cx(s.rel, s.relRemoved)}>
                    <div className={s.relMain}>
                      <span className={s.relName}>
                        {out ? "→ " : "← "}
                        {g.byId.get(otherId)?.name ?? otherId}
                      </span>
                      <span className={s.pill}>{EDGE_TYPE_LABEL[e.type as EaEdgeType] ?? e.type}</span>
                      <Gate action="edit:ea_map">
                        <span className={s.relAct}>
                          <button
                            type="button"
                            className={s.iconBtn}
                            title="Ripristina il legame"
                            aria-label="Ripristina legame"
                            onClick={() =>
                              setDialog({
                                kind: "add",
                                initial: { direction: out ? "out" : "in", otherId, type: e.type as EaEdgeType },
                              })
                            }
                          >
                            <RotateCcw size={13} />
                          </button>
                        </span>
                      </Gate>
                    </div>
                    {e.note && <div className={s.relNote}>{e.note}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {dialog?.kind === "add" && (
        <EaEdgeDialog g={g} node={node} initial={dialog.initial} open onOpenChange={close} />
      )}
      {dialog?.kind === "edit" && <EaEdgeDialog g={g} node={node} edge={dialog.edge} open onOpenChange={close} />}
      {dialog?.kind === "remove" && <EaRemoveEdgeDialog g={g} edge={dialog.edge} open onOpenChange={close} />}
    </section>
  );
}

/* ── History ───────────────────────────────────────────────────── */

const ACTION_LABEL: Record<string, string> = {
  "ea.edge.create": "Legame aggiunto",
  "ea.edge.restore": "Legame ripristinato",
  "ea.edge.update": "Legame modificato",
  "ea.edge.verify": "Legame confermato",
  "ea.edge.remove": "Legame rimosso",
  "ea.node.create": "Nodo creato",
  "ea.node.update": "Scheda modificata",
  "ea.qa.update": "Dati QA aggiornati",
};

function describe(g: EaGraph, h: EaHistoryItem): string | null {
  const edge = (h.detail.after ?? h.detail.edge ?? h.detail.before) as { from?: string; to?: string; note?: string } | undefined;
  if (h.resource_type === "edge" && edge?.from && edge.to) {
    const name = (id: string) => g.byId.get(id)?.name ?? id;
    return `${name(edge.from)} → ${name(edge.to)}${edge.note ? ` · ${edge.note}` : ""}`;
  }
  return null;
}

export function EaHistory({ g, nodeId }: { g: EaGraph; nodeId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useEaNodeHistory(nodeId, open);
  return (
    <section className={s.dbSec}>
      <div className={s.secHead}>
        <h4>Storico modifiche</h4>
        <button type="button" className={s.linkBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Nascondi" : "Mostra"}
        </button>
      </div>
      {open && isLoading && <span className={s.no}>Caricamento…</span>}
      {open && data && data.length === 0 && <span className={s.no}>Nessuna modifica manuale finora.</span>}
      {open && data && data.length > 0 && (
        <ol className={s.hist}>
          {data.map((h, i) => {
            const text = describe(g, h);
            return (
              <li key={`${h.at}-${i}`}>
                <b>{ACTION_LABEL[h.action] ?? h.action}</b>
                <span className={s.no}>
                  {h.actor ?? "utente sconosciuto"} · {new Date(h.at).toLocaleString("it-IT")}
                </span>
                {text && <span className={s.relNote}>{text}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
