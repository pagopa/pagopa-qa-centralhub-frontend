"use client";

import { Fragment, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { useEaChanges, useEaNodeDetail } from "@/hooks/useEaMap";
import { Gate } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type { EaGraph } from "@/lib/ea-map/graph";
import { LAYER_LABEL, domainLabel } from "@/lib/ea-map/datalake";
import type { EaDataset, EaDqCoverage, EaEdge, EaEdgeDetail, EaNode } from "@/types/ea";
import { EaDataLinkDialog, EaLayerDialog, EaLinkDialog, EaRemoveEdgeDialog } from "./EaEditDialogs";
import { ORIGIN_LABEL } from "./EaRelations";
import { cx } from "./shared";
import s from "./ea-map.module.css";

const EDGE_VERB: Record<string, [incoming: string, outgoing: string]> = {
  produces: ["prodotto da", "produce"],
  derives: ["deriva da", "alimenta"],
  feeds: ["usato da", "alimenta"],
};

const SLA_LABEL: Record<string, string> = {
  availability: "Disponibilità",
  retention: "Conservazione",
  frequency: "Frequenza",
  latency: "Latenza",
  freshness: "Freschezza",
  support: "Supporto",
  backup: "Backup",
};

type Server = { type?: string; host?: string; topic?: string; table?: string; database?: string; location?: string; format?: string };
type Contract = {
  path?: string;
  url?: string;
  version?: string | null;
  owner?: string | null;
  contact?: { name?: string; email?: string; url?: string; slack?: string };
  links?: Record<string, string>;
};

function LinkList({
  g,
  edges,
  side,
  onOpen,
  removable = false,
}: {
  g: EaGraph;
  edges: EaEdge[];
  side: "from" | "to";
  onOpen: (id: string) => void;
  removable?: boolean;
}) {
  const [removing, setRemoving] = useState<EaEdge | null>(null);
  return (
    <>
      <ul className={s.dlLinks}>
        {edges.map((e) => {
          const other: EaNode | undefined = g.byId.get(e[side]);
          return (
            <li key={`${e.from}-${e.to}-${e.type}`}>
              <button type="button" className={s.relName} onClick={() => other && onOpen(other.id)} disabled={!other}>
                {other?.name ?? e[side]}
              </button>
              <span className={s.pill}>{side === "from" ? EDGE_VERB[e.type]?.[0] : EDGE_VERB[e.type]?.[1]}</span>
              {e.origin && <span className={s.pill}>{ORIGIN_LABEL[e.origin] ?? e.origin}</span>}
              {e.status === "verified" && <span className={s.pill}>verificato</span>}
              {removable && e.id && (
                <Gate action="edit:ea_map">
                  <button type="button" className={s.linkBtn} aria-label="Rimuovi il legame" onClick={() => setRemoving(e)}>
                    <X size={12} />
                  </button>
                </Gate>
              )}
            </li>
          );
        })}
      </ul>
      {removing && (
        <EaRemoveEdgeDialog
          g={g}
          edge={removing as unknown as EaEdgeDetail}
          open
          onOpenChange={(o) => !o && setRemoving(null)}
        />
      )}
    </>
  );
}

/** Producer proposals of the last sync still waiting in the review queue. */
function PendingProducers({ g, datasetId }: { g: EaGraph; datasetId: string }) {
  const { can } = usePermissions();
  const { data } = useEaChanges(["pending"], null, can("review:ea_map"));
  const mine = (data ?? []).filter((c) => c.entity === "edge" && c.target_id.endsWith(`>${datasetId}:produces`));
  if (!mine.length) return null;
  return (
    <p className={s.no} style={{ margin: 0 }}>
      In revisione:{" "}
      {mine
        .map((c) => {
          const from = c.target_id.split(">")[0];
          const conf = (c.after as { confidence?: number } | null)?.confidence;
          return `${g.byId.get(from)?.name ?? from}${conf ? ` (${conf}%)` : ""}`;
        })
        .join(", ")}
      . Confermalo dalla tab Revisione.
    </p>
  );
}

export function DatasetBody({ g, d, onOpen }: { g: EaGraph; d: EaDataset; onOpen: (id: string) => void }) {
  const { data } = useEaNodeDetail(d.id);
  const attrs = (data?.attrs ?? {}) as Record<string, unknown>;
  const contract = (attrs.contract ?? {}) as Contract;
  const servers = (attrs.servers ?? {}) as Record<string, Server>;
  const sla = (attrs.sla ?? {}) as Record<string, string>;
  const citedBy = (attrs.cited_by ?? []) as string[];
  const inEdges = (g.inEdges.get(d.id) ?? []).filter((e) => e.type in EDGE_VERB);
  const outEdges = (g.outEdges.get(d.id) ?? []).filter((e) => e.type in EDGE_VERB);
  const overridden = typeof attrs.layer_override === "string";
  const [dialog, setDialog] = useState<"producer" | "consumer" | "layer" | "doc" | "slack" | null>(null);
  const docUrl = d.docUrl ?? contract.contact?.url ?? null;
  const slackUrl = d.slackUrl ?? contract.contact?.slack ?? null;
  const close = (o: boolean) => !o && setDialog(null);

  return (
    <>
      {d.desc && <p style={{ margin: 0, fontSize: 15 }}>{d.desc}</p>}
      {!d.contracted && (
        <p className={cx(s.no)} style={{ margin: 0 }}>
          ⚠ Tabella citata nei data contract ma senza un contratto proprio: schema, owner e qualità non sono documentati.
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {d.url && (
          <a className={s.btn} href={d.url} target="_blank" rel="noopener noreferrer">Apri il data contract</a>
        )}
        {docUrl && (
          <a className={cx(s.btn, s.btnGhost)} href={docUrl} target="_blank" rel="noopener noreferrer">Documentazione</a>
        )}
      </div>

      <section className={s.dbSec}>
        <h4>Scheda</h4>
        <dl className={s.kv}>
          <dt>Livello</dt>
          <dd>
            {LAYER_LABEL[d.layer]}
            {overridden && <span className={s.no}> · corretto a mano</span>}
            <Gate action="edit:ea_map">
              <button type="button" className={s.linkBtn} style={{ marginLeft: 8 }} onClick={() => setDialog("layer")}>
                <Pencil size={11} /> Correggi
              </button>
            </Gate>
          </dd>
          <dt>Documentazione</dt>
          <dd>
            {docUrl ? (
              <a href={docUrl} target="_blank" rel="noopener noreferrer" className={s.mono} style={{ wordBreak: "break-all" }}>
                {docUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
              </a>
            ) : (
              <span className={s.no}>nessun link</span>
            )}
            {d.docOverridden && <span className={s.no}> · corretto a mano</span>}
            <Gate action="edit:ea_map">
              <button type="button" className={s.linkBtn} style={{ marginLeft: 8 }} onClick={() => setDialog("doc")}>
                <Pencil size={11} /> {docUrl ? "Correggi" : "Aggiungi"}
              </button>
            </Gate>
          </dd>
          <dt>Dominio</dt><dd>{domainLabel(d.domain)}</dd>
          {d.table && (<><dt>Tabella</dt><dd className={s.mono}>{d.table}</dd></>)}
          {d.topic && (<><dt>Topic</dt><dd className={s.mono}>{d.topic}</dd></>)}
          {d.owner && (<><dt>Owner</dt><dd>{d.owner}</dd></>)}
          {d.version && (<><dt>Versione</dt><dd>{d.version}</dd></>)}
          {d.contracted && (<><dt>Campi</dt><dd>{d.fields}{d.pii > 0 ? ` · ${d.pii} con dati personali` : ""}</dd></>)}
          {d.contracted && (<><dt>Check di qualità</dt><dd>{d.checks > 0 ? `${d.checks} nel contratto (SodaCL)` : "Nessuno nel contratto"}{(d.dq ?? 0) > 0 ? ` · ${d.dq} nel DQ Framework` : ""}</dd></>)}
          {Object.entries(sla).map(([k, v]) => (
            <Fragment key={k}><dt>{SLA_LABEL[k] ?? k}</dt><dd>{v}</dd></Fragment>
          ))}
          {contract.contact?.name && (<><dt>Contatto</dt><dd>{contract.contact.name}{contract.contact.email ? ` · ${contract.contact.email}` : ""}</dd></>)}
          <dt>Slack</dt>
          <dd>
            {slackUrl ? (
              <a href={slackUrl} target="_blank" rel="noopener noreferrer">canale</a>
            ) : (
              <span className={s.no}>nessun canale</span>
            )}
            {d.slackOverridden && <span className={s.no}> · corretto a mano</span>}
            <Gate action="edit:ea_map">
              <button type="button" className={s.linkBtn} style={{ marginLeft: 8 }} onClick={() => setDialog("slack")}>
                <Pencil size={11} /> {slackUrl ? "Correggi" : "Aggiungi"}
              </button>
            </Gate>
          </dd>
        </dl>
      </section>

      {Object.keys(servers).length > 0 && (
        <section className={s.dbSec}>
          <h4>Server</h4>
          <dl className={s.kv}>
            {Object.entries(servers).map(([env, srv]) => (
              <Fragment key={env}>
                <dt>{env}</dt>
                <dd className={s.mono}>
                  {[srv.type, srv.host ?? srv.location, srv.topic ?? srv.table, srv.format].filter(Boolean).join(" · ")}
                </dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}

      <section className={s.dbSec}>
        <div className={s.secHead}>
          <h4>Da dove arriva</h4>
          <Gate action="edit:ea_map">
            <button type="button" className={s.linkBtn} onClick={() => setDialog("producer")}>
              <Plus size={13} /> Collega un produttore
            </button>
          </Gate>
        </div>
        <PendingProducers g={g} datasetId={d.id} />
        {inEdges.length ? (
          <LinkList g={g} edges={inEdges} side="from" onOpen={onOpen} removable />
        ) : (
          <span className={s.no}>
            {d.layer === "ingestion"
              ? "Produttore non ancora collegato: i collegamenti si confermano dalla Revisione."
              : "Il contratto non dichiara da quali tabelle deriva."}
          </span>
        )}
      </section>
      <section className={s.dbSec}>
        <div className={s.secHead}>
          <h4>Dove va</h4>
          <Gate action="edit:ea_map">
            <button type="button" className={s.linkBtn} onClick={() => setDialog("consumer")}>
              <Plus size={13} /> Aggiungi un consumer
            </button>
          </Gate>
        </div>
        {outEdges.length ? (
          <LinkList g={g} edges={outEdges} side="to" onOpen={onOpen} removable />
        ) : (
          <span className={s.no}>Nessun utilizzo dichiarato.</span>
        )}
      </section>
      {(dialog === "producer" || dialog === "consumer") && (
        <EaDataLinkDialog g={g} dataset={d} mode={dialog} open onOpenChange={close} />
      )}
      {dialog === "doc" && (
        <EaLinkDialog kind="doc" dataset={d} current={docUrl} overridden={!!d.docOverridden} open onOpenChange={close} />
      )}
      {dialog === "slack" && (
        <EaLinkDialog kind="slack" dataset={d} current={slackUrl} overridden={!!d.slackOverridden} open onOpenChange={close} />
      )}
      {dialog === "layer" && (
        <EaLayerDialog dataset={d} current={d.layer} overridden={overridden} open onOpenChange={close} />
      )}
      <DqSection d={d} dq={data?.dq} />
      {citedBy.length > 0 && (
        <section className={s.dbSec}>
          <h4>Citata nei contratti</h4>
          <ul className={s.dlLinks}>
            {citedBy.map((id) => (
              <li key={id}>
                <button type="button" className={s.relName} onClick={() => onOpen(id)}>{g.byId.get(id)?.name ?? id}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const DQ_STATUS_LABEL: Record<string, string> = {
  attivo: "Attivi",
  in_sviluppo: "In sviluppo",
  da_implementare: "Da implementare",
  non_attivo: "Non attivi",
};

function Bars({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className={s.dqBars}>
      {entries.map(([k, n]) => (
        <div key={k} className={s.dqBar}>
          <span>{k}</span>
          <i style={{ width: `${(n / max) * 100}%` }} />
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

function DqSection({ d, dq }: { d: EaDataset; dq: EaDqCoverage | null | undefined }) {
  const [showItems, setShowItems] = useState(false);
  if (!dq) return null;
  const nothing = dq.controls === 0 && dq.contract_checks === 0;
  return (
    <section className={s.dbSec}>
      <div className={s.secHead}>
        <h4>Data Quality</h4>
        <a className={s.linkBtn} href="/data-quality/domains">Controlli per dominio ↗</a>
      </div>
      {nothing ? (
        <span className={s.no}>
          {d.contracted
            ? "Nessun check nel contratto e nessun controllo censito nel DQ Framework del Hub."
            : "Tabella senza contratto: nessun check documentato."}
        </span>
      ) : (
        <>
          <dl className={s.kv}>
            <dt>Nel contratto</dt>
            <dd>{dq.contract_checks} check SodaCL</dd>
            <dt>Nel DQ Framework</dt>
            <dd>
              {dq.controls ? `${dq.controls} controlli, ${dq.active} attivi` : "nessun controllo censito"}
              {dq.domains.length > 0 && <span className={s.no}> · dominio {dq.domains.join(", ")}</span>}
            </dd>
            {dq.controls > 0 && dq.contract_checks > 0 && (
              <>
                <dt>Allineamento</dt>
                <dd>
                  {dq.aligned} check in entrambi · {dq.only_contract.length} solo nel contratto ·{" "}
                  {dq.only_hub.length} solo nel Hub
                </dd>
              </>
            )}
          </dl>
          {dq.controls > 0 && (
            <>
              <h5 className={s.dqH}>Controlli del Hub per dimensione</h5>
              <Bars counts={dq.dimensions} />
              <h5 className={s.dqH}>Per stato</h5>
              <Bars counts={Object.fromEntries(Object.entries(dq.statuses).map(([k, n]) => [DQ_STATUS_LABEL[k] ?? k, n]))} />
            </>
          )}
          {dq.contract_checks > 0 && (
            <>
              <h5 className={s.dqH}>Check del contratto per dimensione</h5>
              <Bars counts={dq.contract_dimensions} />
            </>
          )}
          {(dq.items.length > 0 || dq.only_contract.length > 0) && (
            <button type="button" className={s.linkBtn} onClick={() => setShowItems((v) => !v)}>
              {showItems ? "Nascondi il dettaglio" : "Mostra il dettaglio dei controlli"}
            </button>
          )}
          {showItems && (
            <>
              {dq.items.length > 0 && (
                <ul className={s.dlLinks}>
                  {dq.items.map((i) => (
                    <li key={i.id}>
                      <span className={s.mono}>{i.check_name ?? i.control ?? "—"}</span>
                      <span className={s.pill}>{DQ_STATUS_LABEL[i.status] ?? i.status}</span>
                      {i.field_ref && <span className={s.no}>{i.field_ref}</span>}
                      {i.soda_url && (
                        <a className={s.linkBtn} href={i.soda_url} target="_blank" rel="noopener noreferrer">SODA ↗</a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {dq.only_contract.length > 0 && (
                <>
                  <h5 className={s.dqH}>Nel contratto ma non censiti nel Hub</h5>
                  <ul className={s.dlLinks}>
                    {dq.only_contract.map((n) => (
                      <li key={n}><span className={s.mono}>{n}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

/** For consumers (BI, MEF, Banca d'Italia): the datasets that feed them. */
export function DataLakeFeeds({ g, n, onOpen }: { g: EaGraph; n: EaNode; onOpen: (id: string) => void }) {
  const feeds = (g.inEdges.get(n.id) ?? []).filter((e) => e.type === "feeds");
  if (!feeds.length) return null;
  return (
    <section className={s.dbSec}>
      <h4>Dal Data Lake · {feeds.length} dataset</h4>
      <LinkList g={g} edges={feeds} side="from" onOpen={onOpen} />
    </section>
  );
}

/** For components and products: the Data Lake datasets they produce. */
export function DataLakeProduced({ g, n, onOpen }: { g: EaGraph; n: EaNode; onOpen: (id: string) => void }) {
  const produced = (g.outEdges.get(n.id) ?? []).filter((e) => e.type === "produces");
  if (!produced.length) return null;
  return (
    <section className={s.dbSec}>
      <h4>Dati nel Data Lake · {produced.length}</h4>
      <LinkList g={g} edges={produced} side="to" onOpen={onOpen} />
    </section>
  );
}
