"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { EaArea, EaComponent, EaEdge, EaNode, EaProduct } from "@/types/ea";
import {
  KIND_BADGE,
  KIND_GROUP,
  KIND_ORDER,
  areaStats,
  isRuntime,
  kidsOf,
  productOf,
  productStats,
  shortName,
  type EaGraph,
} from "@/lib/ea-map/graph";
import { Crumbs, Footer, QaLegend, QaPills, cx, qc } from "./shared";
import s from "./ea-map.module.css";

const LAYERS = [
  { name: "Canali e touchpoint", d: "Dove il pagamento inizia", areas: ["pay", "chn"], c: "--ea-l-chan" },
  { name: "Servizi di dominio", d: "Posizioni, rendicontazione, commissioni, documenti", areas: ["gps", "fdr", "afm", "evt"], c: "--ea-l-dom" },
  { name: "Core", d: "Nodo dei Pagamenti e configurazione", areas: ["core", "cfg"], c: "--ea-l-core" },
  { name: "Trasversali", d: "Osservabilità, qualità, piattaforma", areas: ["qi", "qa", "plt"], c: "--ea-l-cross" },
];
const TOP_ACTORS = ["ext-citizen", "ext-ec", "ext-psp", "ext-pt", "ext-io"];

interface NavProps {
  g: EaGraph;
  goTo: (nodeId: string | null) => void;
  openNode: (nodeId: string) => void;
}

function Layer({ name, d, color, children }: { name: string; d: string; color: string; children: React.ReactNode }) {
  return (
    <section className={s.layer} style={{ "--lc": `var(${color})` } as CSSProperties}>
      <div className={s.layerH}>
        <b>{name}</b>
        <span>{d}</span>
      </div>
      {children}
    </section>
  );
}

export function PlatformView({ g, goTo, openNode }: NavProps) {
  const rt = g.components.filter(isRuntime);
  const pct = (fn: (c: EaComponent) => boolean) => (rt.length ? Math.round((100 * rt.filter(fn).length) / rt.length) : 0);
  const nrtSuites = new Set(g.components.flatMap((c) => c.qa.nrt)).size;
  const externals = g.kb.nodes.filter((n) => n.type === "external");
  return (
    <>
      <Crumbs path={[{ label: "Piattaforma pagoPA" }]} level={0} />
      <p className={s.intro}>
        La piattaforma dei pagamenti vista dall&apos;alto: {g.areas.length} aree, {g.products.length} prodotti,{" "}
        {g.components.length} componenti con il loro repository. Scegli un&apos;area o un prodotto per scendere di livello;
        attiva la <b>Lente QA</b> per colorare la mappa in base alla maturità dei test.
      </p>
      <div className={s.stats}>
        <div className={s.stat}><b>{g.components.length}</b><span>componenti censiti</span></div>
        <div className={s.stat}><b>{rt.length}</b><span>componenti runtime (MS, FN, FE)</span></div>
        <div className={s.stat}><b>{pct((c) => c.qa.unit > 0)}%</b><span>runtime con unit test</span></div>
        <div className={s.stat}><b>{pct((c) => c.qa.it_repo > 0 || c.qa.it_wf || c.qa.nodo_bdd)}%</b><span>runtime con test di integrazione</span></div>
        <div className={s.stat}><b>{rt.filter((c) => c.qa.tas).length}</b><span>coperti da suite TAS</span></div>
        <div className={s.stat}><b>{nrtSuites}</b><span>suite NRT schedulate</span></div>
      </div>
      <div className={s.layers}>
        <Layer name="Attori" d="Chi usa la piattaforma" color="--ea-l-ext">
          <div className={s.actors}>
            {TOP_ACTORS.map((id) => g.byId.get(id)).filter(Boolean).map((a) => (
              <div key={a!.id} className={s.actor} data-nid={a!.id}><b>{a!.name}</b><span>{a!.desc}</span></div>
            ))}
          </div>
        </Layer>
        {LAYERS.map((L) => (
          <Layer key={L.name} name={L.name} d={L.d} color={L.c}>
            <div className={s.layerBody}>
              {L.areas.map((aid) => g.byId.get(`area:${aid}`) as EaArea | undefined).filter(Boolean).map((a) => {
                const st = areaStats(g, a!.id);
                return (
                  <div key={a!.id} className={s.area}>
                    <button type="button" className={s.areaH} data-nid={a!.id} onClick={() => goTo(a!.id)}>
                      <b>{a!.name}</b>
                      <span>{st.p} prodotti · {st.n} comp.</span>
                    </button>
                    <div className={s.prods}>
                      {kidsOf<EaProduct>(g, a!.id).map((p) => {
                        const ps = productStats(g, p.id);
                        return (
                          <button key={p.id} type="button" className={s.chip} data-nid={p.id} title={p.desc} onClick={() => goTo(p.id)}
                            style={{ "--qc": qc(ps.avg) } as CSSProperties}>
                            <span className={s.dot} style={{ background: qc(ps.avg) }} />
                            {shortName(p.name)}
                            <span className={s.n}>{ps.n}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Layer>
        ))}
        <Layer name="Sistemi esterni" d="Dipendenze fuori perimetro" color="--ea-l-ext">
          <div className={s.actors}>
            {externals.filter((n) => !TOP_ACTORS.includes(n.id)).map((a) => (
              <button key={a.id} type="button" className={s.actor} data-nid={a.id} onClick={() => openNode(a.id)} style={{ cursor: "pointer" }}>
                <b>{a.name}</b>
                <span>{(g.inEdges.get(a.id) ?? []).length} componenti collegati</span>
              </button>
            ))}
          </div>
        </Layer>
      </div>
      <QaLegend />
      <Footer kb={g.kb} />
    </>
  );
}

export function AreaView({ g, goTo, area }: NavProps & { area: EaArea }) {
  return (
    <>
      <Crumbs path={[{ label: "Piattaforma pagoPA", onClick: () => goTo(null) }, { label: area.name }]} level={1} />
      <h2 className={s.h2}>{area.name}</h2>
      <p className={s.intro}>{area.desc}</p>
      <div className={s.grid}>
        {kidsOf<EaProduct>(g, area.id).map((p) => {
          const st = productStats(g, p.id);
          const pages = p.conf.reduce((x, c) => x + c.pages, 0);
          return (
            <button key={p.id} type="button" className={s.card} data-nid={p.id} onClick={() => goTo(p.id)}>
              <div className={s.meta}>
                <span className={s.pill}>{st.n} componenti</span>
                {p.domain && <span className={cx(s.pill, s.mono)}>ns {p.domain}</span>}
                {pages > 0 && <span className={cx(s.pill, s.pillAcc)}>{pages} pag. Confluence</span>}
              </div>
              <h3>{p.name}</h3>
              <p>{p.desc}</p>
              <div className={s.meta} style={{ marginTop: "auto" }}><QaPills stats={st} /></div>
              <div className={s.bar} title={`Maturità media test ${st.avg.toFixed(1)}/5`}>
                <i style={{ width: `${(st.avg / 5) * 100}%`, background: qc(st.avg) }} />
              </div>
            </button>
          );
        })}
      </div>
      <QaLegend />
      <Footer kb={g.kb} />
    </>
  );
}

function CompNode({ c, onOpen }: { c: EaComponent; onOpen: (id: string) => void }) {
  return (
    <button type="button" className={cx(s.node, s.nodeC)} data-nid={c.id} onClick={() => onOpen(c.id)}
      style={{ "--qc": qc(c.qa.score) } as CSSProperties}>
      <span className={s.kb}>{KIND_BADGE[c.kind]}</span>
      <span className={s.nm}>
        {c.name}
        {c.private ? " 🔒" : ""}
        <span className={s.rp}>{c.id}</span>
      </span>
      <span className={s.qs} style={{ background: qc(c.qa.score) }} title={`Maturità test ${c.qa.score}/5`} />
    </button>
  );
}

function OtherNode({ g, n, onOpen }: { g: EaGraph; n: EaNode; onOpen: (id: string) => void }) {
  const sub = n.type === "component" ? shortName(productOf(g, n).name) : n.type === "datastore" ? "datastore" : "esterno";
  const badge = n.type === "component" ? KIND_BADGE[n.kind] : n.type === "datastore" ? "DB" : "EXT";
  return (
    <button type="button" className={cx(s.node, n.type !== "component" && s.nodeExt)} data-nid={n.id} onClick={() => onOpen(n.id)}>
      <span className={s.kb}>{badge}</span>
      <span className={s.nm}>{n.name}<span className={s.rp}>{sub}</span></span>
      <span />
    </button>
  );
}

interface Wire {
  d: string;
  type: string;
  from: string;
  to: string;
}

export function ProductView({ g, goTo, openNode, product }: NavProps & { product: EaProduct }) {
  const area = g.byId.get(product.parent) as EaArea;
  const cs = kidsOf<EaComponent>(g, product.id);
  const ids = new Set(cs.map((c) => c.id));
  const crossing = g.kb.edges.filter((e) => ids.has(e.from) !== ids.has(e.to));
  const uniq = (list: string[]) => [...new Set(list)].map((id) => g.byId.get(id)).filter(Boolean) as EaNode[];
  const outN = uniq(crossing.filter((e) => ids.has(e.from)).map((e) => e.to));
  const inN = uniq(crossing.filter((e) => ids.has(e.to)).map((e) => e.from));
  const groups = KIND_ORDER.map((k) => [k, cs.filter((c) => c.kind === k)] as const).filter(([, arr]) => arr.length);
  const st = productStats(g, product.id);

  const viewRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [hl, setHl] = useState<string | null>(null);

  const draw = useCallback(() => {
    const pv = viewRef.current;
    if (!pv) return;
    const R = pv.getBoundingClientRect();
    const pos: Record<string, { l: number; r: number; y: number }> = {};
    pv.querySelectorAll<HTMLElement>("[data-nid]").forEach((el) => {
      const r = el.getBoundingClientRect();
      pos[el.dataset.nid!] = { l: r.left - R.left, r: r.right - R.left, y: r.top - R.top + r.height / 2 };
    });
    const inside = new Set(kidsOf(g, product.id).map((c) => c.id));
    setWires(
      g.kb.edges
        .filter((e: EaEdge) => inside.has(e.from) !== inside.has(e.to) && pos[e.from] && pos[e.to])
        .map((e) => {
          const a = pos[e.from];
          const b = pos[e.to];
          const dx = Math.max(30, (b.l - a.r) / 2);
          return { d: `M${a.r},${a.y} C${a.r + dx},${a.y} ${b.l - dx},${b.y} ${b.l},${b.y}`, type: e.type, from: e.from, to: e.to };
        }),
    );
  }, [product.id, g]);

  useLayoutEffect(() => draw(), [draw]);
  useEffect(() => {
    // redraw when the diagram changes size (window resize, Hub menu collapsing)
    const pv = viewRef.current;
    if (!pv || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(pv);
    return () => ro.disconnect();
  }, [draw]);

  const hover = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-nid]");
    setHl(el?.dataset.nid ?? null);
  };

  return (
    <>
      <Crumbs
        path={[
          { label: "Piattaforma pagoPA", onClick: () => goTo(null) },
          { label: area.name, onClick: () => goTo(area.id) },
          { label: product.name },
        ]}
        level={2}
      />
      <h2 className={s.h2}>{product.name}</h2>
      <p className={s.intro}>{product.desc}</p>
      <div className={s.side}>
        <div style={{ minWidth: 0 }}>
          <div className={s.legend} style={{ marginBottom: 12 }}>
            <span><i />chiamata API/SOAP</span>
            <span><i className={s.lE} />evento</span>
            <span><i className={s.lD} />dato condiviso</span>
            <span>Passa sul componente per evidenziarne le relazioni.</span>
          </div>
          <div className={s.pview} ref={viewRef} onMouseOver={hover} onMouseLeave={() => setHl(null)}>
            <svg className={s.wires} aria-hidden="true">
              {wires.map((w, i) => (
                <path key={i} d={w.d} className={cx(w.type === "data" && s.data, w.type === "event" && s.event, hl && (w.from === hl || w.to === hl) && s.hl)} />
              ))}
            </svg>
            <div className={s.col}>
              <h4>Chi lo usa</h4>
              {inN.length ? inN.map((n) => <OtherNode key={n.id} g={g} n={n} onOpen={openNode} />) : <span className={s.no}>Nessun chiamante rilevato</span>}
            </div>
            <div className={s.col}>
              <h4>{shortName(product.name)} · {cs.length} componenti</h4>
              {groups.map(([k, arr]) => (
                <div key={k} className={s.grp}>
                  <span>{KIND_GROUP[k]}</span>
                  {arr.map((c) => <CompNode key={c.id} c={c} onOpen={openNode} />)}
                </div>
              ))}
            </div>
            <div className={s.col}>
              <h4>Da cosa dipende</h4>
              {outN.length ? outN.map((n) => <OtherNode key={n.id} g={g} n={n} onOpen={openNode} />) : <span className={s.no}>Nessuna dipendenza rilevata</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div className={s.panel}>
            <h4>Qualità</h4>
            <div className={s.meta}><QaPills stats={st} /></div>
            <div className={s.bar}><i style={{ width: `${(st.avg / 5) * 100}%`, background: qc(st.avg) }} /></div>
            <p className={s.no} style={{ margin: 0, fontSize: 12.5 }}>Maturità media {st.avg.toFixed(1)}/5 su {st.base} componenti runtime.</p>
          </div>
          {(() => {
            const sources = new Set([product.id, ...cs.map((c) => c.id)]);
            const produced = g.kb.edges.filter((e) => e.type === "produces" && sources.has(e.from));
            if (!produced.length) return null;
            return (
              <div className={s.panel}>
                <h4>Dati nel Data Lake</h4>
                <div className={s.links}>
                  {produced.map((e) => (
                    <button key={`${e.from}-${e.to}`} type="button" className={s.relName} style={{ textAlign: "left" }}
                      onClick={() => openNode(e.to)}>
                      {g.byId.get(e.to)?.name ?? e.to}
                      <span className={s.rp}>da {g.byId.get(e.from)?.name ?? e.from}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className={s.panel}>
            <h4>Documentazione Confluence</h4>
            {product.conf.length ? (
              <div className={s.links}>
                {product.conf.map((c) => (
                  <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">
                    <span className={s.sp}>{c.space}</span>
                    <span className={s.lt}>{c.title}</span>
                    <span className={s.lc}>{c.pages > 1 ? `${c.pages} pag.` : ""}</span>
                  </a>
                ))}
              </div>
            ) : (
              <span className={s.no}>Nessuna pagina associata: da censire.</span>
            )}
          </div>
          {product.domain && (
            <div className={s.panel}>
              <h4>Dominio infrastruttura</h4>
              <div className={s.links}>
                <a href={`https://github.com/pagopa/pagopa-infra/tree/main/src/domains/${product.domain}-app`} target="_blank" rel="noopener noreferrer">
                  <span className={s.sp}>IaC</span>
                  <span className={cx(s.lt, s.mono)}>src/domains/{product.domain}-app</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      <QaLegend />
      <Footer kb={g.kb} />
    </>
  );
}
