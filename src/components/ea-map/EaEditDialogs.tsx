"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  eaErrorMessage,
  useCreateEaEdge,
  useRemoveEaEdge,
  useUpdateEaEdge,
  useUpdateEaNode,
  useUpdateEaQa,
} from "@/hooks/useEaMap";
import { KIND_GROUP, KIND_ORDER, searchNodes, type EaGraph } from "@/lib/ea-map/graph";
import type { EaComponent, EaComponentKind, EaEdgeDetail, EaEdgeType, EaNode, EaProduct } from "@/types/ea";

export const EDGE_TYPE_LABEL: Record<EaEdgeType, string> = {
  api: "API REST",
  soap: "SOAP",
  event: "Evento / coda",
  data: "Dati (DB, storage)",
  ui: "Interfaccia utente",
};
const EDGE_TYPES = Object.keys(EDGE_TYPE_LABEL) as EaEdgeType[];
const LINKABLE = new Set(["component", "external", "datastore", "product"]);

const inputCls = "rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-[13px] text-text";
const labelCls = "flex flex-col gap-1 text-[13px]";
const primaryCls =
  "rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] text-[13px] px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryCls =
  "rounded-[var(--radius-sm)] border border-border bg-surface text-text text-[13px] px-3 py-1.5 hover:bg-hover transition-colors";
const dangerCls =
  "rounded-[var(--radius-sm)] border border-danger bg-danger text-white text-[13px] px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

function Shell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  error?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3">{children}</div>
        {error && (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteField({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className={labelCls}>
      <span>
        Nota {required ? <span className="text-danger">*</span> : <span className="text-text-muted">(facoltativa)</span>}
      </span>
      <textarea
        className={`${inputCls} min-h-[72px]`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Da dove viene l'informazione? Es. pagina Confluence, call con il team, codice…"
        required={required}
      />
    </label>
  );
}

/* ── Add / edit a dependency ───────────────────────────────────── */

export interface EdgeDraft {
  direction: "out" | "in";
  otherId: string | null;
  type: EaEdgeType;
}

export function EaEdgeDialog({
  g,
  node,
  edge,
  initial,
  open,
  onOpenChange,
}: {
  g: EaGraph;
  node: EaNode;
  /** When set the dialog edits this edge, otherwise it creates a new one. */
  edge?: EaEdgeDetail | null;
  initial?: Partial<EdgeDraft>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!edge;
  const [direction, setDirection] = useState<"out" | "in">(initial?.direction ?? "out");
  const [otherId, setOtherId] = useState<string | null>(initial?.otherId ?? null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EaEdgeType>((edge?.type as EaEdgeType) ?? initial?.type ?? "api");
  const [label, setLabel] = useState(edge?.label ?? "");
  const [note, setNote] = useState(edge?.note ?? "");
  const create = useCreateEaEdge();
  const update = useUpdateEaEdge();
  const mutation = editing ? update : create;

  const results = useMemo(
    () => searchNodes(g, query, 30).filter((n) => n.id !== node.id && LINKABLE.has(n.type)).slice(0, 8),
    [g, query, node.id],
  );
  const other = otherId ? g.byId.get(otherId) : undefined;
  const canSave = editing ? true : !!otherId && note.trim().length > 0;

  const save = () => {
    if (editing && edge) {
      update.mutate(
        { id: edge.id, type, label: label.trim() || null, note: note.trim() || null },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }
    if (!otherId) return;
    const [from_id, to_id] = direction === "out" ? [node.id, otherId] : [otherId, node.id];
    create.mutate(
      { from_id, to_id, type, label: label.trim() || null, note: note.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const fromName = editing ? g.byId.get(edge!.from)?.name ?? edge!.from : direction === "out" ? node.name : other?.name ?? "…";
  const toName = editing ? g.byId.get(edge!.to)?.name ?? edge!.to : direction === "out" ? other?.name ?? "…" : node.name;

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Modifica legame" : "Aggiungi legame"}
      description={
        editing
          ? "Salvando, il legame diventa verificato a tuo nome: la sincronizzazione non lo sovrascriverà."
          : "Il legame sarà marcato come manuale e verificato. La sincronizzazione non lo toglierà."
      }
      error={eaErrorMessage(mutation.error)}
      footer={
        <>
          <button type="button" className={secondaryCls} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button type="button" className={primaryCls} disabled={!canSave || mutation.isPending} onClick={save}>
            {mutation.isPending ? "Salvataggio…" : "Salva"}
          </button>
        </>
      }
    >
      {!editing && (
        <>
          <fieldset className="flex flex-col gap-1 text-[13px]">
            <legend className="mb-1">Direzione</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="ea-dir" checked={direction === "out"} onChange={() => setDirection("out")} />
              <span>
                <b>{node.name}</b> chiama / usa un altro nodo
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="ea-dir" checked={direction === "in"} onChange={() => setDirection("in")} />
              <span>
                Un altro nodo chiama / usa <b>{node.name}</b>
              </span>
            </label>
          </fieldset>
          <div className={labelCls}>
            <label htmlFor="ea-edge-target">
              {direction === "out" ? "Nodo chiamato" : "Nodo chiamante"} <span className="text-danger">*</span>
            </label>
            {other ? (
              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-subtle px-2 py-1.5">
                <span className="min-w-0">
                  <b>{other.name}</b> <span className="font-mono text-[11.5px] text-text-muted">{other.id}</span>
                </span>
                <button type="button" className="text-[12.5px] text-[var(--accent)]" onClick={() => setOtherId(null)}>
                  Cambia
                </button>
              </div>
            ) : (
              <>
                <input
                  id="ea-edge-target"
                  className={inputCls}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca componente, sistema esterno, datastore…"
                  autoComplete="off"
                />
                {results.length > 0 && (
                  <ul className="max-h-48 overflow-auto rounded-[var(--radius-sm)] border border-border" role="listbox">
                    {results.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-hover"
                          onClick={() => {
                            setOtherId(n.id);
                            setQuery("");
                          }}
                        >
                          <span className="font-semibold">{n.name}</span>
                          <span className="font-mono text-[11px] text-text-muted">
                            {n.type} · {n.id}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
      <p className="text-[12.5px] text-text-muted">
        {fromName} → {toName}
      </p>
      <label className={labelCls}>
        Tipo di legame
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as EaEdgeType)}>
          {EDGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {EDGE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        <span>
          Etichetta <span className="text-text-muted">(facoltativa, es. nome dell&apos;API o della coda)</span>
        </span>
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
      </label>
      <NoteField value={note} onChange={setNote} required={!editing} />
    </Shell>
  );
}

/* ── Remove a dependency ───────────────────────────────────────── */

export function EaRemoveEdgeDialog({
  g,
  edge,
  open,
  onOpenChange,
}: {
  g: EaGraph;
  edge: EaEdgeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const remove = useRemoveEaEdge();
  const name = (id: string) => g.byId.get(id)?.name ?? id;
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Rimuovi legame"
      description={
        <>
          {name(edge.from)} → {name(edge.to)}. Il legame sparisce dalla mappa ma resta nello storico: la
          sincronizzazione non lo riproporrà. Puoi sempre ricrearlo.
        </>
      }
      error={eaErrorMessage(remove.error)}
      footer={
        <>
          <button type="button" className={secondaryCls} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button
            type="button"
            className={dangerCls}
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate({ id: edge.id, note: note.trim() || null }, { onSuccess: () => onOpenChange(false) })
            }
          >
            {remove.isPending ? "Rimozione…" : "Rimuovi"}
          </button>
        </>
      }
    >
      <NoteField value={note} onChange={setNote} />
    </Shell>
  );
}

/* ── Edit a node ───────────────────────────────────────────────── */

export function EaNodeDialog({
  g,
  node,
  open,
  onOpenChange,
}: {
  g: EaGraph;
  node: EaNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isComp = node.type === "component";
  const isProd = node.type === "product";
  const parent = "parent" in node ? node.parent : "";
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.desc ?? "");
  const [parentId, setParentId] = useState(parent);
  const [ctype, setCtype] = useState<EaComponentKind | "">(isComp ? (node as EaComponent).kind : "");
  const update = useUpdateEaNode();

  const save = () => {
    const changes: Parameters<typeof update.mutate>[0] = { id: node.id };
    if (name.trim() !== node.name) changes.name = name.trim();
    if (description !== (node.desc ?? "")) changes.description = description.trim() || null;
    if ((isComp || isProd) && parentId && parentId !== parent) changes.parent_id = parentId;
    if (isComp && ctype && ctype !== (node as EaComponent).kind) changes.ctype = ctype;
    if (Object.keys(changes).length === 1) {
      onOpenChange(false);
      return;
    }
    update.mutate(changes, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={`Modifica ${node.name}`}
      description="Le correzioni manuali hanno la precedenza sui dati letti da GitHub e Confluence."
      error={eaErrorMessage(update.error)}
      footer={
        <>
          <button type="button" className={secondaryCls} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button type="button" className={primaryCls} disabled={!name.trim() || update.isPending} onClick={save}>
            {update.isPending ? "Salvataggio…" : "Salva"}
          </button>
        </>
      }
    >
      <label className={labelCls}>
        Nome
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className={labelCls}>
        Descrizione
        <textarea className={`${inputCls} min-h-[84px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {isComp && (
        <>
          <label className={labelCls}>
            Prodotto di appartenenza
            <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              {g.areas.map((a) => (
                <optgroup key={a.id} label={a.name}>
                  {g.products
                    .filter((p) => p.parent === a.id)
                    .map((p: EaProduct) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Tipo di componente
            <select className={inputCls} value={ctype} onChange={(e) => setCtype(e.target.value as EaComponentKind)}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {KIND_GROUP[k]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {isProd && (
        <label className={labelCls}>
          Area
          <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            {g.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </Shell>
  );
}

/* ── Manual QA data ────────────────────────────────────────────── */

type Tri = "" | "true" | "false";
const toTri = (v: boolean | null | undefined): Tri => (v === null || v === undefined ? "" : v ? "true" : "false");
const fromTri = (v: Tri): boolean | null => (v === "" ? null : v === "true");

export function EaQaDialog({
  component,
  open,
  onOpenChange,
}: {
  component: EaComponent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const q = component.qa;
  const [underQa, setUnderQa] = useState<Tri>(toTri(q.under_qa));
  const [tasCi, setTasCi] = useState<Tri>(toTri(q.tas_ci_override));
  const [owner, setOwner] = useState(q.qa_owner ?? "");
  const [notes, setNotes] = useState(q.qa_notes ?? "");
  const update = useUpdateEaQa();

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={`Dati QA – ${component.name}`}
      description="Questi campi li decide il team QA: la sincronizzazione aggiorna solo i segnali letti dai repository (test trovati, suite, NRT) e non tocca questi valori."
      error={eaErrorMessage(update.error)}
      footer={
        <>
          <button type="button" className={secondaryCls} onClick={() => onOpenChange(false)}>
            Annulla
          </button>
          <button
            type="button"
            className={primaryCls}
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: component.id,
                  under_qa: fromTri(underQa),
                  tas_ci_override: fromTri(tasCi),
                  qa_owner: owner.trim() || null,
                  qa_notes: notes.trim() || null,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {update.isPending ? "Salvataggio…" : "Salva"}
          </button>
        </>
      }
    >
      <label className={labelCls}>
        Sotto QA (perimetro CoE)
        <select className={inputCls} value={underQa} onChange={(e) => setUnderQa(e.target.value as Tri)}>
          <option value="">Da confermare</option>
          <option value="true">Sì, nel perimetro</option>
          <option value="false">No, fuori perimetro</option>
        </select>
      </label>
      <label className={labelCls}>
        La pipeline invoca il TAS
        <select className={inputCls} value={tasCi} onChange={(e) => setTasCi(e.target.value as Tri)}>
          <option value="">Automatico (rilevato dalla CI)</option>
          <option value="true">Sì (forzato)</option>
          <option value="false">No (forzato)</option>
        </select>
      </label>
      <label className={labelCls}>
        Referente QA
        <input className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Persona o team" />
      </label>
      <label className={labelCls}>
        Note QA
        <textarea className={`${inputCls} min-h-[72px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
    </Shell>
  );
}
