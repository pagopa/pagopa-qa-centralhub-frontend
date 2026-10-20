"use client";

import { Fragment } from "react";
import { useEaNodeDetail } from "@/hooks/useEaMap";
import type { EaGraph } from "@/lib/ea-map/graph";
import { LAYER_LABEL, domainLabel } from "@/lib/ea-map/datalake";
import type { EaDataset, EaEdge, EaNode } from "@/types/ea";
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

function LinkList({ g, edges, side, onOpen }: { g: EaGraph; edges: EaEdge[]; side: "from" | "to"; onOpen: (id: string) => void }) {
  return (
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
          </li>
        );
      })}
    </ul>
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
        {contract.contact?.url && (
          <a className={cx(s.btn, s.btnGhost)} href={contract.contact.url} target="_blank" rel="noopener noreferrer">Documentazione</a>
        )}
      </div>

      <section className={s.dbSec}>
        <h4>Scheda</h4>
        <dl className={s.kv}>
          <dt>Livello</dt><dd>{LAYER_LABEL[d.layer]}</dd>
          <dt>Dominio</dt><dd>{domainLabel(d.domain)}</dd>
          {d.table && (<><dt>Tabella</dt><dd className={s.mono}>{d.table}</dd></>)}
          {d.topic && (<><dt>Topic</dt><dd className={s.mono}>{d.topic}</dd></>)}
          {d.owner && (<><dt>Owner</dt><dd>{d.owner}</dd></>)}
          {d.version && (<><dt>Versione</dt><dd>{d.version}</dd></>)}
          {d.contracted && (<><dt>Campi</dt><dd>{d.fields}{d.pii > 0 ? ` · ${d.pii} con dati personali` : ""}</dd></>)}
          {d.contracted && (<><dt>Check di qualità</dt><dd>{d.checks > 0 ? `${d.checks} nel contratto (SodaCL)` : "Nessuno nel contratto"}</dd></>)}
          {Object.entries(sla).map(([k, v]) => (
            <Fragment key={k}><dt>{SLA_LABEL[k] ?? k}</dt><dd>{v}</dd></Fragment>
          ))}
          {contract.contact?.name && (<><dt>Contatto</dt><dd>{contract.contact.name}{contract.contact.email ? ` · ${contract.contact.email}` : ""}</dd></>)}
          {contract.contact?.slack && (<><dt>Slack</dt><dd><a href={contract.contact.slack} target="_blank" rel="noopener noreferrer">canale</a></dd></>)}
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
        <h4>Da dove arriva</h4>
        {inEdges.length ? (
          <LinkList g={g} edges={inEdges} side="from" onOpen={onOpen} />
        ) : (
          <span className={s.no}>
            {d.layer === "ingestion"
              ? "Produttore non ancora collegato: i collegamenti si confermano dalla Revisione."
              : "Il contratto non dichiara da quali tabelle deriva."}
          </span>
        )}
      </section>
      <section className={s.dbSec}>
        <h4>Dove va</h4>
        {outEdges.length ? (
          <LinkList g={g} edges={outEdges} side="to" onOpen={onOpen} />
        ) : (
          <span className={s.no}>Nessun utilizzo dichiarato.</span>
        )}
      </section>
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
