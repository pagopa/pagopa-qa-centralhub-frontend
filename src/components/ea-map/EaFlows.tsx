"use client";

/* «Flussi»: a payment crossing the platform, step by step. Lanes are real nodes of the map;
   an orange token travels along each call. Every step says whether the map already has
   the edge it uses, so the flow and the map check each other. */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, MapPin, Pause, Play, RotateCcw } from "lucide-react";
import type { EaFlow, EaFlowStep } from "@/types/ea";
import { useEaFlows } from "@/hooks/useEaMap";
import type { EaGraph } from "@/lib/ea-map/graph";
import { cx } from "./shared";
import s from "./ea-flows.module.css";

const COL = 150;
const HEAD = 78;
const ROW = 54;
const PAD = 24;
const SPEEDS = [1, 2] as const;
const KIND_LABEL: Record<EaFlowStep["kind"], string> = { user: "azione di una persona", sync: "chiamata", async: "evento", self: "elaborazione interna" };

interface Props {
  g: EaGraph;
  flowId: string | null;
  onSelect: (id: string) => void;
  openNode: (id: string) => void;
  onShow: (ids: string[]) => void;
}

function Diagram({ flow, current, onPick }: { flow: EaFlow; current: number; onPick: (i: number) => void }) {
  const x = (id: string) => PAD + flow.lanes.findIndex((l) => l.id === id) * COL + COL / 2;
  const width = PAD * 2 + flow.lanes.length * COL;
  const height = flow.steps.length * ROW + 30;
  const now = flow.steps[current];
  return (
    <>
      {/* the actors stay pinned at the top while the steps scroll under them */}
      <div className={s.lanesHead} style={{ width }}>
        <svg width={width} height={HEAD} viewBox={`0 0 ${width} ${HEAD}`} aria-hidden="true">
          {flow.lanes.map((l, i) => {
            const cx0 = PAD + i * COL + COL / 2;
            const active = now && (now.from === l.id || now.to === l.id);
            return (
              <g key={l.id}>
                <line x1={cx0} x2={cx0} y1={HEAD - 12} y2={HEAD} className={s.life} />
                <rect x={cx0 - COL / 2 + 8} y={8} width={COL - 16} height={HEAD - 20} rx={10} className={cx(s.laneBox, active && s.laneOn, l.type === "external" && s.laneExt)} />
                <foreignObject x={cx0 - COL / 2 + 12} y={12} width={COL - 24} height={HEAD - 28}>
                  <div className={s.laneText}>
                    <b>{l.name}</b>
                    {l.product && <span>{l.product}</span>}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
      <svg className={s.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Diagramma del flusso ${flow.name}`}>
        <defs>
          {["done", "now", "next"].map((k) => (
            <marker key={k} id={`ea-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={s[`mk_${k}`]} />
            </marker>
          ))}
        </defs>
        {flow.lanes.map((l, i) => {
          const cx0 = PAD + i * COL + COL / 2;
          return <line key={l.id} x1={cx0} x2={cx0} y1={0} y2={height - 10} className={s.life} />;
        })}
        {flow.steps.map((st, i) => {
          const y = 34 + i * ROW;
          const state = i < current ? "done" : i === current ? "now" : "next";
          const x1 = x(st.from);
          const x2 = x(st.to);
          const self = st.from === st.to;
          return (
            <g key={st.index} className={cx(s.step, s[`st_${state}`], st.layer === "piattaforma" && s.platform, st.optional && s.optional)} onClick={() => onPick(i)} role="button" aria-label={`Passo ${i + 1}: ${st.primitive}`}>
              <rect x={PAD} y={y - 26} width={width - PAD * 2} height={ROW - 4} className={s.hit} />
              <text x={self ? x1 + 46 : (x1 + x2) / 2} y={y - 8} textAnchor={self ? "start" : "middle"} className={s.label}>
                {i + 1}. {st.primitive}{st.optional ? " (opz.)" : ""}
              </text>
              {self ? (
                <path d={`M${x1},${y - 2} h30 v14 h-30`} className={cx(s.arrow, st.kind !== "sync" && s.dashed)} markerEnd={`url(#ea-arrow-${state})`} />
              ) : (
                <line x1={x1} y1={y + 4} x2={x2 + (x2 > x1 ? -4 : 4)} y2={y + 4} className={cx(s.arrow, st.kind !== "sync" && s.dashed)} markerEnd={`url(#ea-arrow-${state})`} />
              )}
              {state === "now" && !self && (
                <circle r={7} className={s.token}>
                  <animateMotion key={`${st.index}-${current}`} dur="1.1s" fill="freeze" path={`M${x1},${y + 4} L${x2},${y + 4}`} />
                </circle>
              )}
              {st.on_map === false && <circle cx={PAD + 8} cy={y + 2} r={4} className={s.warnDot} />}
            </g>
          );
        })}
      </svg>
    </>
  );
}

export function EaFlows({ g, flowId, onSelect, openNode, onShow }: Props) {
  const flowsQuery = useEaFlows();
  const flows = useMemo(() => flowsQuery.data ?? [], [flowsQuery.data]);
  const flow = flows.find((f) => f.id === flowId) ?? flows[0];

  if (flowsQuery.isLoading) return <p className={s.dim}>Caricamento dei flussi…</p>;
  if (flowsQuery.isError || !flow) return <div role="alert" className={s.dim}>Flussi non disponibili.</div>;

  return (
    <div className={s.wrap}>
      <nav className={s.list} aria-label="Flussi">
        {flows.map((f) => (
          <button key={f.id} type="button" className={cx(s.card, f.id === flow.id && s.cardOn)} onClick={() => onSelect(f.id)}>
            <b>{f.name}</b>
            <span>{f.subtitle}</span>
            <small>{f.steps.length} passi · {f.lanes.length} attori</small>
          </button>
        ))}
        <p className={s.draft}><AlertTriangle aria-hidden="true" /> Passi allineati ai casi d&apos;uso SANP 3.12.0. Quelli in corsivo sono dettagli interni della piattaforma, che le SANP non mostrano: vanno validati dal team.</p>
      </nav>
      {/* keyed by flow: switching flow restarts the player from the first step */}
      <Player key={flow.id} g={g} flow={flow} openNode={openNode} onShow={onShow} />
    </div>
  );
}

function Player({ g, flow, openNode, onShow }: { g: EaGraph; flow: EaFlow; openNode: Props["openNode"]; onShow: Props["onShow"] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const scroller = useRef<HTMLDivElement>(null);
  const last = flow.steps.length - 1;
  // playback stops by itself on the last step
  const isPlaying = playing && current < last;

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => setCurrent((c) => c + 1), 2600 / speed);
    return () => clearTimeout(t);
  }, [isPlaying, current, speed]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // keep the current step in the middle of the area under the pinned actors
    const top = current * ROW - (el.clientHeight - HEAD) / 2 + ROW;
    if (typeof el.scrollTo === "function") el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [current]);

  const step = flow.steps[current];
  const name = (id: string) => g.byId.get(id)?.name ?? flow.lanes.find((l) => l.id === id)?.name ?? id;
  const missingEdges = flow.steps.filter((x) => x.on_map === false).length;

  return (
      <section className={s.main}>
        <header className={s.head}>
          <div>
            <h3>{flow.name}</h3>
            <p className={s.dim}>
              {flow.sanp_url && (
                <><a href={flow.sanp_url} target="_blank" rel="noopener noreferrer">Caso d&apos;uso SANP ↗</a> · </>
              )}
              Processo <a href="#blueprint">{flow.process_name}</a>
              {flow.services.length > 0 && <> · Servizi: {flow.services.map((x) => x.name).join(", ")}</>}
            </p>
          </div>
          <button type="button" className={s.ghost} onClick={() => onShow(flow.lanes.map((l) => l.id))}>
            <MapPin aria-hidden="true" /> Mostra sulla mappa
          </button>
        </header>

        <div className={s.controls}>
          <button type="button" onClick={() => { setCurrent(0); setPlaying(false); }} aria-label="Dall'inizio"><RotateCcw aria-hidden="true" /></button>
          <button type="button" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} aria-label="Passo precedente"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className={s.play} onClick={() => {
            if (isPlaying) setPlaying(false);
            else {
              if (current >= last) setCurrent(0);
              setPlaying(true);
            }
          }} aria-label={isPlaying ? "Pausa" : "Avvia"}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => setCurrent((c) => Math.min(flow.steps.length - 1, c + 1))} disabled={current >= flow.steps.length - 1} aria-label="Passo successivo"><ChevronRight aria-hidden="true" /></button>
          <span className={s.counter}>Passo {current + 1} di {flow.steps.length}</span>
          <div className={s.progress}><i style={{ width: `${((current + 1) / flow.steps.length) * 100}%` }} /></div>
          <div className={s.speed} role="radiogroup" aria-label="Velocità">
            {SPEEDS.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={speed === v} onClick={() => setSpeed(v)}>{v}×</button>
            ))}
          </div>
        </div>

        <div className={s.stage} ref={scroller}>
          <Diagram flow={flow} current={current} onPick={(i) => { setCurrent(i); setPlaying(false); }} />
        </div>

        {step && (
          <div className={s.stepCard} aria-live="polite">
            <div className={s.stepHead}>
              <span className={s.prim}>{step.primitive}</span>
              <span className={s.kind}>{KIND_LABEL[step.kind]}</span>
              {step.optional && <span className={s.kind}>opzionale</span>}
              {step.layer === "piattaforma" && <span className={s.plat} title="Non è nel caso d'uso SANP: è un dettaglio interno della piattaforma">dettaglio di piattaforma</span>}
              {step.on_map === true && step.edge && (
                <span className={s.okMap} title="Legame presente sulla mappa">✓ sulla mappa · {step.edge.type}{step.edge.origin ? ` · ${step.edge.origin}` : ""}</span>
              )}
              {step.on_map === false && <span className={s.noMap}>legame non presente sulla mappa</span>}
            </div>
            <p>{step.text}</p>
            <div className={s.who}>
              <button type="button" onClick={() => openNode(step.from)}>{name(step.from)}</button>
              {step.from !== step.to && (
                <>
                  <span>→</span>
                  <button type="button" onClick={() => openNode(step.to)}>{name(step.to)}</button>
                </>
              )}
            </div>
          </div>
        )}
        {missingEdges > 0 && (
          <p className={s.dim}>
            {missingEdges} {missingEdges === 1 ? "passo usa un legame" : "passi usano legami"} che la mappa non ha ancora (punto rosso nel diagramma): candidati da aggiungere in Revisione.
          </p>
        )}
      </section>
  );
}
