"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EaDataset, EaNode } from "@/types/ea";
import type { EaGraph } from "@/lib/ea-map/graph";
import {
  DL_COLUMNS,
  LAYER_LABEL,
  NO_FILTERS,
  domainLabel,
  domains,
  layout,
  lineage,
  stats,
  type DlFilters,
} from "@/lib/ea-map/datalake";
import { cx } from "./shared";
import s from "./ea-map.module.css";

interface Wire {
  d: string;
  type: string;
  from: string;
  to: string;
}

function DatasetBox({ d, on, dim, onPick }: { d: EaDataset; on: boolean; dim: boolean; onPick: (id: string) => void }) {
  const where = d.table ?? d.topic ?? "";
  return (
    <button
      type="button"
      data-nid={d.id}
      className={cx(s.node, s.dlNode, !d.contracted && s.nodeExt, on && s.on, dim && s.dlDim)}
      aria-pressed={on}
      onClick={() => onPick(d.id)}
      title={d.contracted ? d.desc : "Tabella citata nei contratti ma senza un data contract proprio"}
    >
      <span className={cx(s.kb, s[`dl_${d.layer}`])}>{LAYER_LABEL[d.layer]}</span>
      <span className={s.nm}>
        {d.name}
        {where && <span className={s.rp}>{where}</span>}
      </span>
      <span className={s.dlBadges}>
        {!d.contracted && <span title="Senza data contract">⚠</span>}
        {d.pii > 0 && <span title={`${d.pii} campi con dati personali`}>PII</span>}
        {d.checks > 0 && <span title={`${d.checks} check di qualità nel contratto`}>✓{d.checks}</span>}
        {(d.dq ?? 0) > 0 && (
          <span className={s.dlDq} title={`${d.dq} controlli nel DQ Framework del Hub, ${d.dqActive ?? 0} attivi`}>
            DQ {d.dqActive ?? 0}/{d.dq}
          </span>
        )}
      </span>
    </button>
  );
}

function OtherBox({ n, on, dim, onPick }: { n: EaNode; on: boolean; dim: boolean; onPick: (id: string) => void }) {
  const badge = n.type === "component" ? "COMP" : n.type === "product" ? "PRD" : "EXT";
  return (
    <button
      type="button"
      data-nid={n.id}
      className={cx(s.node, s.dlNode, n.type === "external" && s.nodeExt, on && s.on, dim && s.dlDim)}
      aria-pressed={on}
      onClick={() => onPick(n.id)}
    >
      <span className={s.kb}>{badge}</span>
      <span className={s.nm}>
        {n.name}
        {n.type === "component" && <span className={s.rp}>{n.id}</span>}
      </span>
      <span />
    </button>
  );
}

export function EaDataLake({
  g,
  selected,
  onSelect,
  onOpen,
}: {
  g: EaGraph;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const [filters, setFilters] = useState<DlFilters>(NO_FILTERS);
  const lay = useMemo(() => layout(g, filters), [g, filters]);
  const st = useMemo(() => stats(g), [g]);
  const doms = useMemo(() => domains(g), [g]);
  const chain = useMemo(() => (selected && lay.shown.has(selected) ? lineage(g, selected) : null), [g, selected, lay]);
  const selectedNode = selected ? g.byId.get(selected) : undefined;

  const viewRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);

  const draw = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const R = view.getBoundingClientRect();
    const pos: Record<string, { l: number; r: number; y: number }> = {};
    view.querySelectorAll<HTMLElement>("[data-nid]").forEach((el) => {
      const r = el.getBoundingClientRect();
      pos[el.dataset.nid!] = { l: r.left - R.left, r: r.right - R.left, y: r.top - R.top + r.height / 2 };
    });
    setWires(
      lay.edges
        .filter((e) => pos[e.from] && pos[e.to])
        .map((e) => {
          const a = pos[e.from];
          const b = pos[e.to];
          // same column (e.g. gold → gold): loop out on the right
          if (Math.abs(a.l - b.l) < 4) {
            const x = a.r + 18;
            return { d: `M${a.r},${a.y} C${x},${a.y} ${x},${b.y} ${b.r},${b.y}`, type: e.type, from: e.from, to: e.to };
          }
          const dx = Math.max(24, (b.l - a.r) / 2);
          return { d: `M${a.r},${a.y} C${a.r + dx},${a.y} ${b.l - dx},${b.y} ${b.l},${b.y}`, type: e.type, from: e.from, to: e.to };
        }),
    );
  }, [lay]);

  useLayoutEffect(() => draw(), [draw]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(view);
    return () => ro.disconnect();
  }, [draw]);

  const pick = (id: string) => onSelect(selected === id ? null : id);
  const isOn = (id: string) => selected === id;
  const isDim = (id: string) => !!chain && !chain.has(id);

  if (st.datasets === 0 && st.uncontracted === 0) {
    return (
      <div role="status" className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-dim">
        Nessun dataset del Data Lake nella mappa. I dataset arrivano dai data contract del repository{" "}
        <code>pagopa/pdnd-data-contracts</code> alla prossima sincronizzazione (pulsante &quot;Sincronizza ora&quot;).
      </div>
    );
  }

  return (
    <div className={s.dl}>
      <p className={s.intro}>
        Il percorso dei dati della piattaforma nel Data Lake aziendale, ricostruito dai data contract: da chi li produce,
        all&apos;ingestion, alle tabelle silver e gold, fino a chi li usa. Clicca un elemento per evidenziarne tutta la
        catena a monte e a valle.
      </p>
      <div className={s.stats}>
        <div className={s.stat}><b>{st.datasets}</b><span>data contract</span></div>
        <div className={s.stat}><b>{st.ingestion}</b><span>ingestion</span></div>
        <div className={s.stat}><b>{st.silver}</b><span>tabelle silver</span></div>
        <div className={s.stat}><b>{st.gold + st.export}</b><span>tabelle gold ed export</span></div>
        <div className={s.stat}><b>{st.uncontracted}</b><span>tabelle senza contratto</span></div>
        <div className={s.stat}><b>{st.noProducer}</b><span>ingestion senza produttore</span></div>
        <div className={s.stat}><b>{st.withDq}</b><span>dataset con controlli DQ</span></div>
      </div>

      <div className={s.dlFilters} role="group" aria-label="Filtri del Data Lake">
        <div className={s.dlChips}>
          <button type="button" className={cx(s.dlChip, filters.domain === null && s.dlChipOn)} aria-pressed={filters.domain === null}
            onClick={() => setFilters((f) => ({ ...f, domain: null }))}>
            Tutti
          </button>
          {doms.map((d) => (
            <button key={d.key} type="button" className={cx(s.dlChip, filters.domain === d.key && s.dlChipOn)}
              aria-pressed={filters.domain === d.key}
              onClick={() => setFilters((f) => ({ ...f, domain: f.domain === d.key ? null : d.key }))}>
              {domainLabel(d.key)} <span className={s.n}>{d.n}</span>
            </button>
          ))}
        </div>
        <label className={s.dlToggle}>
          <input type="checkbox" checked={filters.uncontracted}
            onChange={(e) => setFilters((f) => ({ ...f, uncontracted: e.target.checked }))} />
          Solo senza contratto
        </label>
        <label className={s.dlToggle}>
          <input type="checkbox" checked={filters.noProducer}
            onChange={(e) => setFilters((f) => ({ ...f, noProducer: e.target.checked }))} />
          Ingestion senza produttore
        </label>
        <label className={s.dlToggle}>
          <input type="checkbox" checked={!!filters.noDq}
            onChange={(e) => setFilters((f) => ({ ...f, noDq: e.target.checked }))} />
          Senza controlli DQ
        </label>
      </div>

      <div className={s.legend}>
        <span><i />deriva da</span>
        <span><i className={s.lE} />produce</span>
        <span><i className={s.lD} />alimenta</span>
        <span>⚠ senza data contract · PII dati personali · ✓ check nel contratto · DQ controlli attivi/censiti nel DQ Framework</span>
      </div>

      {selectedNode && (
        <div className={s.dlSel} role="status">
          <span>
            <b>{selectedNode.name}</b>
            {chain && <span className={s.no}> · {chain.size - 1} elementi collegati</span>}
          </span>
          <button type="button" className={s.btn} onClick={() => onOpen(selectedNode.id)}>Apri la scheda</button>
          <button type="button" className={cx(s.btn, s.btnGhost)} onClick={() => onSelect(null)}>Deseleziona</button>
        </div>
      )}

      <div className={s.dlView} ref={viewRef}>
        <svg className={s.wires} aria-hidden="true">
          {wires.map((w, i) => (
            <path
              key={i}
              d={w.d}
              className={cx(
                w.type === "feeds" && s.data,
                w.type === "produces" && s.event,
                chain && chain.has(w.from) && chain.has(w.to) && s.hl,
                chain && !(chain.has(w.from) && chain.has(w.to)) && s.dlFaint,
              )}
            />
          ))}
        </svg>
        {DL_COLUMNS.map((col) => {
          const groups = lay.columns[col.key];
          const empty = groups.every((gr) => gr.nodes.length === 0);
          return (
            <div key={col.key} className={s.col}>
              <h4 title={col.hint}>{col.title}</h4>
              {empty ? (
                <span className={s.no}>
                  {col.key === "sources"
                    ? "Nessun produttore collegato: i collegamenti si confermano dalla Revisione o dalla scheda del dataset."
                    : "—"}
                </span>
              ) : (
                groups.map((gr) => (
                  <div key={gr.domain ?? "_"} className={s.grp}>
                    {(col.key === "ingestion" || col.key === "silver" || col.key === "gold") && <span>{domainLabel(gr.domain)}</span>}
                    {gr.nodes.map((n) =>
                      n.type === "dataset" ? (
                        <DatasetBox key={n.id} d={n} on={isOn(n.id)} dim={isDim(n.id)} onPick={pick} />
                      ) : (
                        <OtherBox key={n.id} n={n} on={isOn(n.id)} dim={isDim(n.id)} onPick={pick} />
                      ),
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
