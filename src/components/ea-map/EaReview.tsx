"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { Gate } from "@/lib/permissions";
import {
  eaErrorMessage,
  useBulkDecideEaChanges,
  useDecideEaChange,
  useEaChanges,
  useEaSyncRuns,
  useEaSyncStatus,
  useTriggerEaSync,
} from "@/hooks/useEaMap";
import { KIND_GROUP, KIND_ORDER, type EaGraph } from "@/lib/ea-map/graph";
import type { EaChange, EaComponentKind, EaSyncRun } from "@/types/ea";
import { infraType } from "@/lib/ea-map/infraIcons";
import { DATA_EDGE_LABEL, EDGE_TYPE_LABEL } from "./EaEditDialogs";
import { Crumbs, cx } from "./shared";
import s from "./ea-map.module.css";

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const RUN_STATUS: Record<string, [string, string]> = {
  running: ["in corso", ""],
  success: ["completata", "ok"],
  partial: ["parziale", "warn"],
  failed: ["fallita", "ko"],
};

/* ── Sync bar (toolbar) ───────────────────────────────────────── */

export function EaSyncBar({ onReview }: { onReview: () => void }) {
  const status = useEaSyncStatus();
  const trigger = useTriggerEaSync();
  const data = status.data;
  const running = !!data?.running || trigger.isPending;
  const last = data?.last;
  const error = eaErrorMessage(trigger.error);
  return (
    <div className={s.syncBar} aria-live="polite">
      <span className={s.no}>
        {data?.running
          ? `Sincronizzazione in corso dalle ${fmt(data.running.started_at)}…`
          : last
            ? `Ultima sincronizzazione ${fmt(last.finished_at ?? last.started_at)} · ${RUN_STATUS[last.status]?.[0] ?? last.status}`
            : "Mai sincronizzata: i dati vengono dall'import iniziale"}
      </span>
      {!data?.running && last && last.status !== "success" && last.error && (
        <span className={s.syncErr} title={last.error}>
          {last.error.length > 90 ? `${last.error.slice(0, 90)}…` : last.error}
        </span>
      )}
      {!!data?.open_changes && (
        <Gate action="review:ea_map">
          <button type="button" className={cx(s.pill, s.pillWarn, s.pillBtn)} onClick={onReview}>
            {data.open_changes} da revisionare
          </button>
        </Gate>
      )}
      {error && <span className={s.syncErr}>{error}</span>}
      <Gate action="sync:trigger">
        <button type="button" className={s.syncBtn} disabled={running} onClick={() => trigger.mutate()}>
          <RefreshCw size={14} className={running ? "animate-spin" : undefined} aria-hidden="true" />
          {running ? "Sincronizzazione…" : "Sincronizza ora"}
        </button>
      </Gate>
    </div>
  );
}

/* ── Review queue ─────────────────────────────────────────────── */

type Group = "new" | "archived" | "producer" | "infra" | "edge_add" | "edge_remove" | "conflict";

const GROUPS: [Group, string, string][] = [
  ["new", "Nuovi repository", "Repository dell'organizzazione con un owner già presente nella mappa. Scegli il prodotto e il tipo, oppure ignorali: non verranno riproposti."],
  ["archived", "Repository e contratti archiviati", "Componenti il cui repository è archiviato o non esiste più, e dataset il cui data contract è stato tolto. Archiviandoli spariscono dalla mappa insieme ai loro legami."],
  ["producer", "Produttori del Data Lake", "Chi invia i dati di un'ingestion al Data Lake, proposto confrontando il topic del data contract con i componenti della mappa. Confermandoli compaiono nella vista Data Lake; rifiutandoli non vengono riproposti."],
  ["infra", "Risorse infrastrutturali da collegare", "Namespace AKS, API e Function del Terraform il cui nome corrisponde a un nodo della mappa. Confermandoli, la risorsa si apre dalla scheda del nodo e viceversa; rifiutandoli non vengono riproposti."],
  ["edge_add", "Nuove dipendenze", "Legami trovati nella configurazione Helm di produzione. Confermandoli diventano verificati; rifiutandoli non vengono riproposti."],
  ["edge_remove", "Dipendenze sparite", "Legami rilevati in passato dal codice che oggi non compaiono più nella configurazione."],
  ["conflict", "Conflitti", "Legami confermati da una persona che la configurazione non riporta più: decidi tu se esistono ancora."],
];

function groupOf(c: EaChange): Group {
  if (c.status === "conflict") return "conflict";
  if (c.entity === "node") return c.op === "add" ? "new" : "archived";
  if (c.entity === "infra") return "infra";
  if (c.op === "add" && c.target_id.endsWith(":produces")) return "producer";
  return c.op === "add" ? "edge_add" : "edge_remove";
}

function edgeParts(c: EaChange): { from: string; to: string; type: string } {
  const [from, rest] = c.target_id.split(">");
  const i = rest.lastIndexOf(":");
  return { from, to: rest.slice(0, i), type: rest.slice(i + 1) };
}

function Decision({
  change,
  approveLabel,
  rejectLabel,
  extra,
  disabledApprove,
  overrides,
}: {
  change: EaChange;
  approveLabel: string;
  rejectLabel: string;
  extra?: ReactNode;
  disabledApprove?: boolean;
  overrides?: Record<string, string>;
}) {
  const decide = useDecideEaChange();
  const [note, setNote] = useState("");
  const error = eaErrorMessage(decide.error);
  return (
    <div className={s.revAct}>
      {extra}
      <input
        className={s.revNote}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (facoltativa)"
        aria-label="Nota sulla decisione"
      />
      <button
        type="button"
        className={cx(s.revBtn, s.revOk)}
        disabled={decide.isPending || disabledApprove}
        onClick={() => decide.mutate({ id: change.id, approve: true, note: note || null, ...overrides })}
      >
        <Check size={14} /> {approveLabel}
      </button>
      <button
        type="button"
        className={s.revBtn}
        disabled={decide.isPending}
        onClick={() => decide.mutate({ id: change.id, approve: false, note: note || null })}
      >
        <X size={14} /> {rejectLabel}
      </button>
      {error && <span className={s.syncErr}>{error}</span>}
    </div>
  );
}

function NewRepoCard({ g, change }: { g: EaGraph; change: EaChange }) {
  const a = (change.after ?? {}) as {
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    ctype?: EaComponentKind;
    private?: boolean;
    attrs?: { ns?: string | null; owners?: string[]; lang?: string[]; fw?: string[]; readme?: string };
  };
  const [name, setName] = useState(a.name ?? change.target_id);
  const [parent, setParent] = useState(a.parent_id ?? "");
  const [ctype, setCtype] = useState<EaComponentKind>(a.ctype ?? "be");
  const stack = [...(a.attrs?.lang ?? []), ...(a.attrs?.fw ?? [])].join(" · ");
  return (
    <li className={s.revItem}>
      <div className={s.revHead}>
        <b>{change.target_id}</b>
        <a href={`https://github.com/pagopa/${change.target_id}`} target="_blank" rel="noopener noreferrer" className={s.revLink}>
          GitHub <ExternalLink size={12} />
        </a>
        {a.attrs?.ns && <span className={cx(s.pill, s.mono)}>ns {a.attrs.ns}</span>}
        {(a.attrs?.owners ?? []).map((o) => <span key={o} className={s.pill}>{o}</span>)}
      </div>
      {(a.description || a.attrs?.readme) && <p className={s.relNote}>{a.description || a.attrs?.readme}</p>}
      {stack && <p className={s.no}>{stack}</p>}
      <Gate action="review:ea_map">
        <Decision
          change={change}
          approveLabel="Aggiungi alla mappa"
          rejectLabel="Ignora"
          disabledApprove={!parent}
          overrides={{ name, parent_id: parent, ctype }}
          extra={
            <>
              <input className={s.revNote} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome del componente" />
              <select className={s.revNote} value={parent} onChange={(e) => setParent(e.target.value)} aria-label="Prodotto">
                <option value="">Scegli il prodotto…</option>
                {g.areas.map((ar) => (
                  <optgroup key={ar.id} label={ar.name}>
                    {g.products.filter((p) => p.parent === ar.id).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select className={s.revNote} value={ctype} onChange={(e) => setCtype(e.target.value as EaComponentKind)} aria-label="Tipo">
                {KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_GROUP[k]}</option>)}
              </select>
            </>
          }
        />
      </Gate>
    </li>
  );
}

function InfraLinkCard({ g, change, onOpen }: { g: EaGraph; change: EaChange; onOpen: (id: string) => void }) {
  const a = (change.after ?? {}) as {
    node_id?: string;
    label?: string;
    ltype?: string;
    rule?: string;
    evidence?: { repo?: string; file?: string };
  };
  const node = a.node_id ? g.byId.get(a.node_id) : undefined;
  const t = infraType(a.ltype ?? "");
  return (
    <li className={s.revItem}>
      <div className={s.revHead}>
        <span className={s.pill}>{t.label}</span>
        <b>{a.label ?? change.target_id}</b>
        <span className={s.no}>→</span>
        {node ? (
          <button type="button" className={s.relName} onClick={() => onOpen(node.id)}>{node.name}</button>
        ) : (
          <span className={s.relName}>{a.node_id}</span>
        )}
        <span className={s.pill}>{a.rule === "namespace" ? "namespace" : "nome"}</span>
      </div>
      {a.evidence?.file && (
        <p className={cx(s.relNote, s.mono)}>
          {a.evidence.repo}/{a.evidence.file}
        </p>
      )}
      <Gate action="review:ea_map">
        <Decision change={change} approveLabel="Collega" rejectLabel="Rifiuta" />
      </Gate>
    </li>
  );
}

function ChangeCard({ g, change, onOpen }: { g: EaGraph; change: EaChange; onOpen: (id: string) => void }) {
  const name = (id: string) => g.byId.get(id)?.name ?? id;
  const link = (id: string) =>
    g.byId.has(id) ? (
      <button type="button" className={s.relName} onClick={() => onOpen(id)}>{name(id)}</button>
    ) : (
      <span className={s.relName}>{id}</span>
    );
  const group = groupOf(change);
  if (group === "infra") return <InfraLinkCard g={g} change={change} onOpen={onOpen} />;
  if (group === "archived") {
    const reason = String((change.after ?? {}).reason ?? "");
    return (
      <li className={s.revItem}>
        <div className={s.revHead}>{link(change.target_id)}<span className={cx(s.mono, s.no)}>{change.target_id}</span></div>
        <p className={s.relNote}>{reason}</p>
        <Gate action="review:ea_map">
          <Decision change={change} approveLabel="Archivia" rejectLabel="Mantieni" />
        </Gate>
      </li>
    );
  }
  const e = edgeParts(change);
  const after = (change.after ?? {}) as { confidence?: number; evidence?: { value?: string; topic?: string; rule?: string } };
  const evidence = after.evidence ?? {};
  const typeLabel = EDGE_TYPE_LABEL[e.type as keyof typeof EDGE_TYPE_LABEL] ?? DATA_EDGE_LABEL[e.type] ?? e.type;
  return (
    <li className={s.revItem}>
      <div className={s.revHead}>
        {link(e.from)} <span className={s.no}>→</span> {link(e.to)}
        <span className={s.pill}>{typeLabel}</span>
        {after.confidence !== undefined && <span className={s.pill}>confidenza {after.confidence}%</span>}
      </div>
      {evidence.value && <p className={cx(s.relNote, s.mono)}>{evidence.value}</p>}
      {evidence.topic && (
        <p className={s.relNote}>
          Topic <span className={s.mono}>{evidence.topic}</span>
          {evidence.rule && <> · {evidence.rule}</>}
        </p>
      )}
      <Gate action="review:ea_map">
        {group === "edge_add" || group === "producer" ? (
          <Decision change={change} approveLabel="Conferma" rejectLabel="Rifiuta" />
        ) : (
          <Decision change={change} approveLabel="Rimuovi" rejectLabel="Esiste ancora" />
        )}
      </Gate>
    </li>
  );
}

function AutoApplied({ run }: { run: EaSyncRun | null | undefined }) {
  const [open, setOpen] = useState(false);
  const { data } = useEaChanges(["auto_applied"], run?.id, open && !!run);
  if (!run) return null;
  return (
    <section className={s.panel}>
      <div className={s.secHead}>
        <h4>Applicato automaticamente nell&apos;ultima sincronizzazione</h4>
        <button type="button" className={s.linkBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Nascondi" : `Mostra (${run.stats.auto_applied ?? 0})`}
        </button>
      </div>
      <p className={s.no}>Metadati dei repository, segnali QA, link Confluence e riepiloghi dell&apos;infrastruttura: dati osservati che non richiedono una decisione.</p>
      {open && data && (
        <ul className={s.autoList}>
          {data.map((c) => (
            <li key={c.id}>
              <span className={s.kb}>{c.entity === "qa" ? "QA" : c.entity === "doc" ? "DOC" : c.entity === "infra" ? "INFRA" : "META"}</span>{" "}
              <b>{c.target_id}</b>: {Object.keys(c.after ?? {}).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Runs() {
  const { data } = useEaSyncRuns();
  if (!data?.length) return null;
  return (
    <section className={s.panel}>
      <h4>Ultime sincronizzazioni</h4>
      <div className={s.tableWrap}>
        <table className={s.runs}>
          <thead>
            <tr><th>Avvio</th><th>Origine</th><th>Esito</th><th>Repo letti</th><th>Proposte</th><th>Applicate</th><th>Note</th></tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const [label, tone] = RUN_STATUS[r.status] ?? [r.status, ""];
              return (
                <tr key={r.id}>
                  <td>{fmt(r.started_at)}</td>
                  <td>{r.trigger === "beat" ? "settimanale" : r.trigger === "import" ? "import" : r.triggered_by ?? "manuale"}</td>
                  <td><span className={cx(s.pill, tone === "ok" && s.pillOk, (tone === "warn" || tone === "ko") && s.pillWarn)}>{label}</span></td>
                  <td>{r.stats.repos_read ?? "—"}</td>
                  <td>{r.trigger === "import" ? "—" : (r.stats.pending ?? 0) + (r.stats.conflicts ?? 0)}</td>
                  <td>{r.stats.auto_applied ?? "—"}</td>
                  <td className={s.runErr}>{r.error ?? (r.stats.repos_failed ? `${r.stats.repos_failed} repo non letti` : "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BulkButtons({ ids, group }: { ids: string[]; group: Group }) {
  const bulk = useBulkDecideEaChanges();
  const [result, setResult] = useState<string | null>(null);
  if (group === "new" || ids.length < 2) return null;
  const run = (approve: boolean) =>
    bulk.mutate(
      { ids, approve },
      {
        onSuccess: (res) => {
          const failed = Object.values(res).filter((v) => v.startsWith("error")).length;
          setResult(failed ? `${failed} non applicate: riprova singolarmente` : null);
        },
      },
    );
  const [ok, ko] = group === "edge_add" || group === "producer" ? ["Conferma tutte", "Rifiuta tutte"] : group === "archived" ? ["Archivia tutti", "Mantieni tutti"] : ["Rimuovi tutte", "Mantieni tutte"];
  return (
    <Gate action="review:ea_map">
      <span className={s.revAct}>
        <button type="button" className={cx(s.revBtn, s.revOk)} disabled={bulk.isPending} onClick={() => run(true)}>{ok}</button>
        <button type="button" className={s.revBtn} disabled={bulk.isPending} onClick={() => run(false)}>{ko}</button>
        {result && <span className={s.syncErr}>{result}</span>}
      </span>
    </Gate>
  );
}

export function EaReview({ g, goTo, onOpen }: { g: EaGraph; goTo: (id: string | null) => void; onOpen: (id: string) => void }) {
  const changes = useEaChanges();
  const status = useEaSyncStatus();
  const grouped = useMemo(() => {
    const m = new Map<Group, EaChange[]>();
    for (const c of changes.data ?? []) {
      const k = groupOf(c);
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return m;
  }, [changes.data]);
  const total = changes.data?.length ?? 0;

  return (
    <>
      <Crumbs path={[{ label: "Piattaforma pagoPA", onClick: () => goTo(null) }, { label: "Revisione" }]} level={-1} />
      <div className={s.revIntro}>
        <h1 className={s.h2}>Revisione della sincronizzazione</h1>
        <p className={s.intro}>
          Ogni settimana (e quando qualcuno preme &quot;Sincronizza ora&quot;) la mappa rilegge GitHub, Confluence e i data contract del Data Lake. I dati osservati si
          aggiornano da soli; i cambiamenti di struttura aspettano qui una decisione. Ogni scelta resta nello storico del nodo e
          non viene riproposta.
        </p>
      </div>
      {changes.isLoading && <p className={s.no}>Caricamento…</p>}
      {changes.isError && <p className={s.no}>Impossibile caricare la coda di revisione.</p>}
      {changes.data && total === 0 && (
        <div className={s.panel}><b>Nessuna proposta in attesa.</b><span className={s.no}>La mappa è allineata all&apos;ultima sincronizzazione.</span></div>
      )}
      {GROUPS.map(([key, title, help]) => {
        const items = grouped.get(key) ?? [];
        if (!items.length) return null;
        return (
          <section key={key} className={s.revGroup}>
            <div className={s.secHead}>
              <h3>{title} <span className={s.no}>({items.length})</span></h3>
              <BulkButtons ids={items.map((c) => c.id)} group={key} />
            </div>
            <p className={s.no}>{help}</p>
            <ul className={s.revList}>
              {items.map((c) =>
                key === "new" ? <NewRepoCard key={c.id} g={g} change={c} /> : <ChangeCard key={c.id} g={g} change={c} onOpen={onOpen} />,
              )}
            </ul>
          </section>
        );
      })}
      <AutoApplied run={status.data?.last} />
      <Runs />
    </>
  );
}
