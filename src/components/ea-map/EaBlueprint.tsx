"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PanelRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { EaArea, EaComponent, EaProduct } from "@/types/ea";
import { useEaFlows } from "@/hooks/useEaMap";
import { useStoredFlag } from "@/lib/stored-flag";
import {
  blueprintIndex,
  hasIntegrationTests,
  isRuntime,
  kidsOf,
  processScore,
  runtimeComponentsOfProduct,
  shortName,
  traceBlueprint,
  type EaGraph,
} from "@/lib/ea-map/graph";
import { ScoreBar, cx, qc, riskClass } from "./shared";
import s from "./ea-map.module.css";

const PANELS_HIDDEN_KEY = "ea-map-blueprint-panels-hidden";
const AREA_ORDER = ["pay", "chn", "gps", "fdr", "afm", "evt", "core", "cfg", "qi", "qa", "plt"];

interface Wire {
  d: string;
  x: number;
  y: number;
}

export function EaBlueprint({ g, goTo, openNode }: { g: EaGraph; goTo: (id: string) => void; openNode: (id: string) => void }) {
  const bp = g.kb.blueprint;
  const P = bp.panels;
  const idx = useMemo(() => blueprintIndex(g), [g]);
  const [sel, setSel] = useState<string | null>(null);
  const trace = useMemo(() => (sel ? traceBlueprint(g, bp, sel) : null), [g, bp, sel]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);

  const draw = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !trace) {
      setWires([]);
      return;
    }
    const R = stage.getBoundingClientRect();
    const box: Record<string, { x: number; t: number; b: number }> = {};
    stage.querySelectorAll<HTMLElement>("[data-bp]").forEach((el) => {
      const r = el.getBoundingClientRect();
      box[el.dataset.bp!] = { x: r.left - R.left + r.width / 2, t: r.top - R.top, b: r.bottom - R.top };
    });
    const seen = new Set<string>();
    const out: Wire[] = [];
    for (const [a, b] of trace.wires) {
      const key = `${a}>${b}`;
      if (seen.has(key) || !box[a] || !box[b]) continue;
      seen.add(key);
      let A = box[a];
      let B = box[b];
      if (A.t > B.t) [A, B] = [B, A];
      const my = (A.b + B.t) / 2;
      out.push({ d: `M${A.x},${A.b} C${A.x},${my} ${B.x},${my} ${B.x},${B.t}`, x: B.x, y: B.t });
    }
    setWires(out);
  }, [trace]);

  useLayoutEffect(() => draw(), [draw]);
  useEffect(() => {
    // redraw when the stage changes size: window resize, side panels or Hub menu collapsing
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  const [wide, setWide] = useStoredFlag(PANELS_HIDDEN_KEY);
  const [panelsOpen, setPanelsOpen] = useState(false);
  useEffect(() => {
    if (!panelsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelsOpen]);

  const pick = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSel((cur) => (cur === id ? null : id));
  };
  const selClass = (id: string) => cx(s.selAble, trace?.ids.has(id) && s.on, sel === id && s.focus);

  const rt = g.components.filter(isRuntime);
  const aks = bp.infra.filter((i) => i.group === "aks");
  const infraRow = (groups: string[]) => bp.infra.filter((i) => groups.includes(i.group));
  const riskEntries = Object.entries(bp.risk);

  const leftPanels = (
    <>
        {P.mission && <div className={s.bpBox}><h4>Missione</h4><p>{P.mission}</p></div>}
        {P.stakeholders && (
          <div className={s.bpBox}><h4>Stakeholder</h4><ul>{P.stakeholders.map((x) => <li key={x}>{x}</li>)}</ul></div>
        )}
        {P.initiatives && (
          <div className={s.bpBox}>
            <h4>Iniziative e progetti</h4>
            <div className={s.bpLinks}>
              {P.initiatives.map((i) => <a key={i.url} href={i.url} target="_blank" rel="noopener noreferrer">{i.name}</a>)}
            </div>
          </div>
        )}
    </>
  );
  const rightPanels = (
    <>
        {P.principles && (
          <div className={s.bpBox}>
            <h4>Principi architetturali</h4>
            <div className={s.princ}>{P.principles.map(([a, b]) => <div key={a}><b>{a}</b><span>{b}</span></div>)}</div>
          </div>
        )}
        {riskEntries.length > 0 && (
          <div className={s.bpBox}>
            <h4>Criticità componenti</h4>
            <div className={s.risk}>
              {riskEntries.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <span>{shortName(idx.get(`prod:${k}`)?.name ?? idx.get(k)?.name ?? k)}</span>
                  <span className={riskClass(v)}>{v}</span>
                </div>
              ))}
            </div>
            {bp.riskSrc && <p style={{ fontSize: 12 }}><a href={bp.riskSrc} target="_blank" rel="noopener noreferrer">Fonte: Componenti e rischio</a></p>}
          </div>
        )}
        <div className={s.bpBox}>
          <h4>Numeri chiave</h4>
          <div className={s.kfig}>
            <b>{bp.services.length}</b><span>servizi offerti</span>
            <b>{bp.processes.length}</b><span>processi di business</span>
            <b>{g.products.length}</b><span>prodotti</span>
            <b>{rt.length}</b><span>componenti runtime</span>
            <b>{aks.length}</b><span>namespace AKS</span>
            <b>{g.kb.edges.length}</b><span>integrazioni mappate</span>
          </div>
        </div>
    </>
  );

  return (
    <div className={cx(s.bp, wide && s.bpWide)}>
      <div className={s.bpHead}>
        {!wide && <div className={s.bpBox}><h4>Ambito</h4><p>Dipartimento Pagamenti · piattaforma pagoPA</p></div>}
        <div className={cx(s.bpBox, s.bpTitle)}>
          <h2>Enterprise Architecture Blueprint · pagoPA</h2>
          <span>Dal servizio al cittadino fino al namespace AKS: seleziona un elemento per vederne l&apos;impatto su tutti i livelli</span>
          <div className={s.bpTools}>
            {wide && (
              <button type="button" className={s.bpTool} onClick={() => setPanelsOpen(true)}>
                <PanelRight size={15} aria-hidden="true" /> Apri pannelli
              </button>
            )}
            <button type="button" className={s.bpTool} onClick={() => setWide(!wide)} aria-pressed={wide}>
              {wide ? <PanelRightOpen size={15} aria-hidden="true" /> : <PanelRightClose size={15} aria-hidden="true" />}
              {wide ? "Mostra pannelli laterali" : "Nascondi pannelli laterali"}
            </button>
          </div>
        </div>
        {!wide && <div className={s.bpBox}>
          <h4>Aggiornamento</h4>
          <p>
            KB del {g.kb.meta.generated ?? "—"} · {g.kb.meta.sources?.github_repos ?? 0} repo ·{" "}
            {(g.kb.meta.sources?.confluence_pages ?? 0).toLocaleString("it-IT")} pagine
          </p>
        </div>}
      </div>

      {wide && sel && (
        <ImpactPanel g={g} sel={sel} ids={trace?.ids ?? null} name={idx.get(sel)?.name ?? sel} goTo={goTo} openNode={openNode} strip />
      )}

      {!wide && <aside className={s.bpSide}>{leftPanels}</aside>}

      <div ref={stageRef} className={cx(s.stage, sel && s.hasSel)} onClick={() => setSel(null)}>
        <svg aria-hidden="true">
          {wires.map((w, i) => (
            <g key={i}><path d={w.d} /><circle cx={w.x} cy={w.y} r={2.5} /></g>
          ))}
        </svg>

        <section className={s.lvl}>
          <div className={s.lvlLab}><small>Livello 1</small>Contesto</div>
          <div className={cx(s.plane, s.plCtx)}>
            <div className={s.ctxSegs}>
              {bp.segments.map((x) => (
                <button key={x.id} type="button" data-bp={x.id} className={cx(s.segBox, selClass(x.id))} onClick={pick(x.id)}>
                  <b>{x.name}</b><span>{x.who.join(" · ")}</span>
                </button>
              ))}
            </div>
            <div className={s.svcs}>
              {bp.services.map((x) => (
                <button key={x.id} type="button" data-bp={x.id} className={cx(s.svc, selClass(x.id))} onClick={pick(x.id)}>{x.name}</button>
              ))}
            </div>
          </div>
        </section>

        <section className={s.lvl}>
          <div className={s.lvlLab}><small>Livello 2</small>Processi</div>
          <div className={cx(s.plane, s.plProc)}>
            <div className={s.fns}>
              {bp.functions.map((f) => (
                <div key={f.id} style={{ minWidth: 0 }}>
                  <button type="button" data-bp={f.id} className={cx(s.fnh, selClass(f.id))} onClick={pick(f.id)}><span>{f.name}</span></button>
                  <div className={s.fncol}>
                    {bp.processes.filter((p) => p.fn === f.id).map((p) => {
                      const sc = processScore(g, p.prod);
                      return (
                        <button key={p.id} type="button" data-bp={p.id} className={cx(s.proc, selClass(p.id))} onClick={pick(p.id)}
                          style={{ "--qc": qc(sc) } as CSSProperties} title={`Maturità media ${sc.toFixed(1)}/5`}>
                          {p.name}
                          {p.suites.length > 0 && <span className={s.bdg}>{p.suites.map((x) => <i key={x}>{x}</i>)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.lvl}>
          <div className={s.lvlLab}><small>Livello 3</small>Applicazioni</div>
          <div className={cx(s.plane, s.plApp)}>
            <div className={s.doms}>
              {AREA_ORDER.map((a) => g.byId.get(`area:${a}`) as EaArea | undefined).filter(Boolean).map((a) => (
                <div key={a!.id} className={s.dom}>
                  <button type="button" data-bp={a!.id} className={cx(s.domH, selClass(a!.id))} onClick={pick(a!.id)}>{a!.name}</button>
                  {kidsOf<EaProduct>(g, a!.id).map((p) => {
                    const cs = runtimeComponentsOfProduct(g, p.id);
                    const sc = cs.length ? cs.reduce((x, c) => x + c.qa.score, 0) / cs.length : 0;
                    const r = bp.risk[p.id.slice(5)];
                    return (
                      <button key={p.id} type="button" data-bp={p.id} className={cx(s.app, selClass(p.id))} onClick={pick(p.id)}
                        style={{ "--qc": qc(sc) } as CSSProperties}>
                        <span>{shortName(p.name).replace(/ \(.*\)$/, "")}</span>
                        {r && <span className={riskClass(r)}>{r}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.lvl}>
          <div className={s.lvlLab}><small>Livello 4</small>Infrastruttura</div>
          <div className={cx(s.plane, s.plInf)}>
            <div className={s.infs}>
              {([["Accesso", ["edge"]], ["Calcolo", ["core", "compute"]], ["AKS", ["aks"]], ["Dati", ["data"]]] as const).map(([label, groups]) => (
                <InfraRow key={label} label={label} items={infraRow([...groups])} risk={bp.risk} selClass={selClass} pick={pick} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {!wide && (
        <aside className={s.bpSide}>
        <ImpactPanel g={g} sel={sel} ids={trace?.ids ?? null} name={sel ? idx.get(sel)?.name ?? sel : null} goTo={goTo} openNode={openNode} />
          {rightPanels}
        </aside>
      )}

      {panelsOpen && (
        <>
          <div className={s.scrim} onClick={() => setPanelsOpen(false)} aria-hidden="true" />
          <aside className={s.drawer} role="dialog" aria-modal="true" aria-label="Pannelli del Blueprint">
            <div className={s.dh}>
              <h2>Pannelli</h2>
              <button type="button" className={s.x} aria-label="Chiudi" onClick={() => setPanelsOpen(false)} autoFocus>✕</button>
            </div>
            <div className={s.db}>
              {leftPanels}
              {rightPanels}
            </div>
          </aside>
        </>
      )}

      <div className={s.bpFoot}>
        <div className={s.bpBox}>
          <h4>Come si legge</h4>
          <p>Ogni livello poggia su quello sotto. Seleziona un servizio, un processo, un prodotto o una risorsa: la mappa evidenzia la catena verticale e il pannello Impatto riassume cosa tocca e quanto è coperto dai test.</p>
        </div>
        {P.qa_gate && (
          <div className={s.bpBox}><h4>Quality Gate</h4><ol className={s.gate}>{P.qa_gate.map((x) => <li key={x}>{x}</li>)}</ol></div>
        )}
        <div className={s.bpBox}>
          <h4>Legenda</h4>
          <div className={s.lg}>
            <span><i style={{ background: "var(--bp-ctx)" }} />Contesto: utenti e servizi</span>
            <span><i style={{ background: "var(--bp-proc)" }} />Processi per funzione</span>
            <span><i style={{ background: "var(--bp-app)" }} />Prodotti per area</span>
            <span><i style={{ background: "var(--bp-inf)" }} />Risorse cloud e namespace</span>
            <span><span className={riskClass("HIGH")}>HIGH</span>criticità dichiarata</span>
          </div>
        </div>
        {P.references && (
          <div className={s.bpBox}>
            <h4>Documenti di riferimento</h4>
            <div className={s.bpLinks}>{P.references.map((r) => <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>)}</div>
          </div>
        )}
        <div className={s.bpBox}>
          <h4>Infrastruttura come codice</h4>
          <div className={s.bpLinks}>
            <a href="https://github.com/pagopa/pagopa-infra/tree/main/src/domains" target="_blank" rel="noopener noreferrer">Domini in pagopa-infra</a>
            <a href="https://github.com/pagopa/pagopa-infra-core" target="_blank" rel="noopener noreferrer">pagopa-infra-core</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfraRow({
  label,
  items,
  risk,
  selClass,
  pick,
}: {
  label: string;
  items: { id: string; name: string; group: string; desc: string }[];
  risk: Record<string, string>;
  selClass: (id: string) => string;
  pick: (id: string) => (e: React.MouseEvent) => void;
}) {
  return (
    <>
      <span>{label}</span>
      <div className={s.infrow}>
        {items.map((i) => (
          <button key={i.id} type="button" data-bp={i.id} title={i.desc} onClick={pick(i.id)}
            className={cx(s.inf, i.group === "aks" && s.infNs, selClass(i.id))}>
            {i.name}
            {risk[i.id] && <> <span className={riskClass(risk[i.id])}>{risk[i.id]}</span></>}
          </button>
        ))}
      </div>
    </>
  );
}

/** «Guarda il flusso» for a process or service that has a curated flow. */
function FlowLinks({ sel }: { sel: string }) {
  const flows = useEaFlows().data ?? [];
  const hits = flows.filter((f) => f.process === sel || f.services.some((x) => x.id === sel));
  if (!hits.length) return null;
  return (
    <p className={s.flowLinks}>
      {hits.map((f) => (
        <a key={f.id} href={`#f-${f.id}`}>▶ Guarda il flusso: {f.name}</a>
      ))}
    </p>
  );
}

function ImpactPanel({
  g,
  sel,
  ids,
  name,
  goTo,
  openNode,
  strip = false,
}: {
  g: EaGraph;
  sel: string | null;
  ids: Set<string> | null;
  name: string | null;
  goTo: (id: string) => void;
  openNode: (id: string) => void;
  strip?: boolean;
}) {
  if (!sel || !ids) {
    if (strip) return null;
    return (
      <div className={cx(s.bpBox, s.imp)}>
        <h4>Impatto</h4>
        <p>Seleziona un elemento della mappa per vedere servizi, processi, prodotti e risorse coinvolti e la loro copertura di test.</p>
      </div>
    );
  }
  const bp = g.kb.blueprint;
  const list = [...ids];
  const services = list.filter((i) => bp.services.some((x) => x.id === i));
  const processes = bp.processes.filter((p) => ids.has(p.id));
  const products = g.products.filter((p) => ids.has(p.id));
  const infra = list.filter((i) => bp.infra.some((x) => x.id === i));
  const cs: EaComponent[] = products.flatMap((p) => runtimeComponentsOfProduct(g, p.id));
  const avg = cs.length ? cs.reduce((a, c) => a + c.qa.score, 0) / cs.length : 0;
  const nrt = [...new Set(cs.flatMap((c) => c.qa.nrt))];
  const suites = [...new Set(processes.flatMap((p) => p.suites))];
  const noTest = cs.filter((c) => !hasIntegrationTests(c));
  const proc = bp.processes.find((p) => p.id === sel);

  return (
    <div className={cx(s.bpBox, s.imp, strip && s.impStrip)}>
      <h4>Impatto · {name}</h4>
      {proc?.ref && <p style={{ fontSize: 12.5 }}><a href={proc.ref.url} target="_blank" rel="noopener noreferrer">{proc.ref.title}</a></p>}
      <FlowLinks sel={sel} />
      <div className={s.kfig}>
        <b>{services.length}</b><span>servizi</span>
        <b>{processes.length}</b><span>processi</span>
        <b>{products.length}</b><span>prodotti</span>
        <b>{cs.length}</b><span>componenti runtime</span>
        <b>{infra.length}</b><span>risorse infra</span>
      </div>
      <div className={s.impGrp}>
        <h5>Copertura test</h5>
        <div className={s.score}><ScoreBar value={avg} /><b>{avg.toFixed(1)}/5</b></div>
        <div className={s.meta}>
          {nrt.length ? <span className={cx(s.pill, s.pillOk)}>NRT: {nrt.join(", ")}</span> : <span className={cx(s.pill, s.pillWarn)}>Nessuna NRT</span>}
          {suites.map((x) => <span key={x} className={s.pill}>{x}</span>)}
        </div>
      </div>
      {noTest.length > 0 && (
        <div className={s.impGrp}>
          <h5>Senza test di integrazione ({noTest.length})</h5>
          <div className={s.deps}>
            {noTest.slice(0, strip ? 6 : 12).map((c) => <button key={c.id} type="button" onClick={() => openNode(c.id)}>{c.name}</button>)}
            {noTest.length > (strip ? 6 : 12) && <span className={s.no}>+{noTest.length - (strip ? 6 : 12)}</span>}
          </div>
        </div>
      )}
      {products.length > 0 && (
        <div className={s.impGrp}>
          <h5>Apri il prodotto</h5>
          <div className={s.deps}>{products.map((p) => <button key={p.id} type="button" onClick={() => goTo(p.id)}>{shortName(p.name)}</button>)}</div>
        </div>
      )}
    </div>
  );
}
