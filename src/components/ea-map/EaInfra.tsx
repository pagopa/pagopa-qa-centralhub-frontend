"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ExternalLink, FileCode2, X } from "lucide-react";
import type { EaInfraEnv, EaInfraResource } from "@/types/ea";
import type { EaGraph } from "@/lib/ea-map/graph";
import { useEaInfra, useEaInfraResource } from "@/hooks/useEaMap";
import {
  EXTERNAL_STACK,
  NO_INFRA_FILTERS,
  buildIndex,
  connected,
  domainLabel,
  externalReason,
  layeredView,
  hasFilters,
  layoutStack,
  monitoringRows,
  monitoringRowsOfDomain,
  monitoringSummary,
  resolveSelection,
  stackMatches,
  stacksByRepo,
  visibleLinks,
  type InfraBox,
  type InfraFilters,
  type InfraIndex,
  type InfraStack,
  type MonitoringRow,
} from "@/lib/ea-map/infra";
import { ENTRY_ACTORS, LAYER_STYLE, SEVERITY_LABEL, VENDORS, channelStyle, infraType } from "@/lib/ea-map/infraIcons";
import { cx } from "./shared";
import s from "./ea-infra.module.css";

const ENV_LABEL: Record<EaInfraEnv, string> = { prod: "Prod", uat: "UAT", dev: "Dev" };
const BAND_LIMIT = 40;
const NEIGHBOUR_LIMIT = 30;

interface Wire {
  d: string;
  inferred: boolean;
  hl: boolean;
}

function TypeIcon({ ltype, size = "md" }: { ltype: string; size?: "sm" | "md" }) {
  const t = infraType(ltype);
  const Icon = t.icon;
  return (
    <span className={cx(s.ic, size === "sm" && s.icSm)} style={{ "--tc": t.color } as CSSProperties} title={t.label} aria-hidden="true">
      <Icon />
    </span>
  );
}

function ResourceCard({
  r,
  env,
  on,
  dim,
  onPick,
}: {
  r: EaInfraResource;
  env: EaInfraEnv;
  on: boolean;
  dim: boolean;
  onPick: (id: string) => void;
}) {
  const only = r.envs.length === 1 ? r.envs[0] : null;
  return (
    <button
      type="button"
      data-rid={r.id}
      className={cx(s.card, r.external && s.cardExt, on && s.on, dim && s.dim)}
      aria-pressed={on}
      onClick={() => onPick(r.id)}
      title={`${infraType(r.ltype).label} · ${r.tf_type}`}
    >
      <TypeIcon ltype={r.ltype} />
      <span className={s.cardText}>
        <span className={s.cardName}>{r.label}</span>
        <span className={s.cardSub}>{r.address}</span>
      </span>
      <span className={s.badges}>
        {r.vendor !== "azure" && <span className={s.vendor}>{VENDORS[r.vendor]?.short ?? r.vendor}</span>}
        {only && only === env && <span className={s.envOnly} title={`Esiste solo in ${only}`}>solo {only}</span>}
        {(r.node || r.blueprint) && <span className={s.linked} title="Collegata a un nodo della mappa">mappa</span>}
      </span>
    </button>
  );
}

function ContainerBox({
  box,
  env,
  selected,
  onPick,
}: {
  box: InfraBox;
  env: EaInfraEnv;
  selected: string | null;
  onPick: (id: string) => void;
}) {
  const r = box.res;
  const t = infraType(r.ltype);
  const leaves = box.children.filter((c) => c.children.length === 0);
  const nested = box.children.filter((c) => c.children.length > 0);
  return (
    <section className={cx(s.box, s[`box_${r.ltype}`])} aria-label={`${t.label} ${r.label}`}>
      <button type="button" data-rid={r.id} className={cx(s.boxHead, selected === r.id && s.on)} onClick={() => onPick(r.id)}>
        <TypeIcon ltype={r.ltype} size="sm" />
        <span className={s.boxTitle}>{r.label}</span>
        <span className={s.boxKind}>{t.label}</span>
      </button>
      {nested.map((b) => (
        <ContainerBox key={b.res.id} box={b} env={env} selected={selected} onPick={onPick} />
      ))}
      {leaves.length > 0 && (
        <div className={s.grid}>
          {leaves.map((c) => (
            <ResourceCard key={c.res.id} r={c.res} env={env} on={selected === c.res.id} dim={false} onPick={onPick} />
          ))}
        </div>
      )}
    </section>
  );
}

function MonitoringBand({
  rows,
  title,
  onPick,
}: {
  rows: MonitoringRow[];
  title: string;
  onPick: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  const sum = useMemo(() => monitoringSummary(rows), [rows]);
  const shown = all ? rows : rows.slice(0, BAND_LIMIT);
  return (
    <section className={s.band} aria-label="Monitoring e alerting">
      <header className={s.bandHead}>
        <h3>Monitoring &amp; Alerting <span className={s.muted}>· {title}</span></h3>
        <div className={s.bandStats}>
          <span><b>{sum.alerts}</b> alert</span>
          {Object.entries(sum.bySeverity)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([sev, n]) => (
              <span key={sev} className={cx(s.sev, s[`sev${sev}`])}>{SEVERITY_LABEL[sev] ?? `Sev ${sev}`}: {n}</span>
            ))}
          {sum.withoutGroup > 0 && <span className={s.warn}>{sum.withoutGroup} senza action group risolto</span>}
          {Object.entries(sum.channels).map(([c, n]) => {
            const ch = channelStyle(c);
            const Icon = ch.icon;
            return (
              <span key={c} className={s.chan}><Icon aria-hidden="true" /> {ch.label}: {n}</span>
            );
          })}
        </div>
      </header>
      {rows.length === 0 ? (
        <p className={s.muted}>Nessun alert definito nel Terraform per questo ambito e ambiente.</p>
      ) : (
        <div className={s.chainTable} role="table" aria-label="Catena di monitoring">
          <div className={s.chainRow} role="row">
            <span role="columnheader">Risorsa monitorata</span>
            <span role="columnheader">Regola</span>
            <span role="columnheader">Action group</span>
            <span role="columnheader">Canali</span>
          </div>
          {shown.map(({ alert, targets, groups }) => (
            <div key={alert.id} className={s.chainRow} role="row">
              <span role="cell" className={s.chainCell}>
                {targets.length ? targets.map((t) => (
                  <button key={t.id} type="button" className={s.chip} onClick={() => onPick(t.id)}>
                    <TypeIcon ltype={t.ltype} size="sm" />{t.label}
                  </button>
                )) : <span className={s.muted}>non risolta</span>}
                <ArrowRight className={s.arrow} aria-hidden="true" />
              </span>
              <span role="cell" className={s.chainCell}>
                <button type="button" className={s.chip} onClick={() => onPick(alert.id)}>
                  <span className={cx(s.sevDot, s[`sev${alert.severity ?? "x"}`])} aria-hidden="true" />
                  {alert.label}
                  {alert.kind && <span className={s.muted}> · {alert.kind === "metric" ? "metrica" : alert.kind === "log" ? "log" : alert.kind}</span>}
                </button>
                <ArrowRight className={s.arrow} aria-hidden="true" />
              </span>
              <span role="cell" className={s.chainCell}>
                {groups.length ? groups.map((g) => (
                  <button key={g.id} type="button" className={s.chip} onClick={() => onPick(g.id)}>{g.label}</button>
                )) : <span className={s.warn}>nessuno</span>}
                <ArrowRight className={s.arrow} aria-hidden="true" />
              </span>
              <span role="cell" className={s.chainCell}>
                {[...new Set(groups.flatMap((g) => g.channels))].map((c) => {
                  const ch = channelStyle(c);
                  const Icon = ch.icon;
                  return <span key={c} className={s.chan} title={ch.label}><Icon aria-hidden="true" /> {ch.label}</span>;
                })}
              </span>
            </div>
          ))}
          {rows.length > BAND_LIMIT && (
            <button type="button" className={s.more} onClick={() => setAll((v) => !v)}>
              {all ? "Mostra meno" : `Mostra tutti (${rows.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ResourcePanel({
  id,
  g,
  onClose,
  onPick,
  openNode,
}: {
  id: string;
  g: EaGraph;
  onClose: () => void;
  onPick: (id: string) => void;
  openNode: (id: string) => void;
}) {
  const q = useEaInfraResource(id);
  const d = q.data;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const t = d ? infraType(d.ltype) : null;
  const mapNodes = d ? [d.node, d.blueprint].filter((n): n is string => !!n && g.byId.has(n)) : [];
  const attrs = d ? Object.entries(d.attrs).filter(([k]) => k !== "description") : [];
  return (
    <aside className={s.panel} role="dialog" aria-label="Dettaglio della risorsa">
      <header className={s.panelHead}>
        {d && <TypeIcon ltype={d.ltype} />}
        <div className={s.panelTitle}>
          <h3>{d?.label ?? "…"}</h3>
          {d && t && <span className={s.muted}>{t.label} · {VENDORS[d.vendor]?.label ?? d.vendor}</span>}
        </div>
        <button type="button" className={s.close} aria-label="Chiudi" onClick={onClose}><X /></button>
      </header>
      {q.isLoading && <p className={s.muted}>Caricamento…</p>}
      {q.isError && <p role="alert" className={s.warn}>Impossibile caricare la risorsa.</p>}
      {d && (
        <div className={s.panelBody}>
          {externalReason(d) && <p className={s.reason}>{externalReason(d)}</p>}
          {typeof d.attrs.description === "string" && <p>{d.attrs.description}</p>}
          <dl className={s.facts}>
            <dt>Terraform</dt>
            <dd className={s.mono}>{d.tf_type}<br />{d.address}</dd>
            <dt>Stack</dt>
            <dd className={s.mono}>{d.external ? "non gestita nei repository letti" : `${d.repo} / ${d.stack}`}</dd>
            <dt>Ambienti</dt>
            <dd>{d.envs.join(", ") || "—"}</dd>
            {Object.keys(d.names).length > 0 && (
              <>
                <dt>Nome per ambiente</dt>
                <dd className={s.mono}>
                  {Object.entries(d.names).map(([e, n]) => <div key={e}>{e}: {n}</div>)}
                </dd>
              </>
            )}
            {Object.keys(d.locations).length > 0 && (
              <>
                <dt>Region</dt>
                <dd>{[...new Set(Object.values(d.locations))].join(", ")}</dd>
              </>
            )}
            {Array.isArray(d.attrs.hostnames) && (
              <>
                <dt>Indirizzo pubblico</dt>
                <dd>
                  {(d.attrs.hostnames as string[]).map((h) => (
                    <a key={h} className={s.link} href={`https://${h}`} target="_blank" rel="noreferrer">{h}</a>
                  ))}
                </dd>
              </>
            )}
            {typeof d.attrs.static_storage === "string" && (
              <>
                <dt>File statici su</dt>
                <dd className={s.mono}>{d.attrs.static_storage}</dd>
              </>
            )}
            {attrs.filter(([k]) => !["hostnames", "static_storage", "reason"].includes(k)).map(([k, v]) => (
              <div key={k} className={s.factPair}>
                <dt>{k}</dt>
                <dd className={s.mono}>{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
              </div>
            ))}
            {d.parent && (
              <>
                <dt>Contenuta in</dt>
                <dd><button type="button" className={s.link} onClick={() => onPick(d.parent!)}>{d.parent.split(":").pop()}</button></dd>
              </>
            )}
            {d.children > 0 && (
              <>
                <dt>Contiene</dt>
                <dd>{d.children} risorse</dd>
              </>
            )}
          </dl>

          <div className={s.actions}>
            {mapNodes.map((n) => (
              <button key={n} type="button" className={s.btn} onClick={() => openNode(n)}>
                Apri nella mappa: {g.byId.get(n)?.name ?? n}
              </button>
            ))}
            {d.file_url && (
              <a className={s.btnGhost} href={d.file_url} target="_blank" rel="noreferrer">
                <FileCode2 aria-hidden="true" /> File Terraform <ExternalLink aria-hidden="true" />
              </a>
            )}
          </div>

          {[["Usa", d.out], ["Usata da", d.in]].map(([title, list]) =>
            (list as typeof d.out).length ? (
              <div key={title as string} className={s.rel}>
                <h4>{title as string} <span className={s.muted}>({(list as typeof d.out).length})</span></h4>
                <ul>
                  {(list as typeof d.out).map((l) => (
                    <li key={`${l.id}-${l.kind}`}>
                      <button type="button" className={s.relItem} onClick={() => onPick(l.id)}>
                        <TypeIcon ltype={l.ltype} size="sm" />
                        <span>{l.label}</span>
                        <span className={cx(s.origin, l.origin === "inferred" && s.originInf)}
                          title={l.origin === "inferred" ? "Dedotta: abbinata per nome tra stack diversi" : "Esplicita: riferimento nel Terraform"}>
                          {l.kind === "monitors" ? "monitora" : l.kind === "notifies" ? "notifica" : l.origin === "inferred" ? "dedotta" : "esplicita"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </aside>
  );
}

function Overview({
  idx,
  filters,
  onStack,
}: {
  idx: InfraIndex;
  filters: InfraFilters;
  onStack: (key: string) => void;
}) {
  const filtered = hasFilters(filters);
  // with filters on, only the stacks holding matching resources, with their counts
  const groups = useMemo(
    () =>
      stacksByRepo(idx)
        .map(({ repo, stacks }) => ({
          repo,
          stacks: stacks
            .map((st) => ({ st, match: filtered ? stackMatches(idx, st, filters) : null }))
            .filter(({ match }) => !match || Object.keys(match).length > 0),
        }))
        .filter((gr) => gr.stacks.length > 0),
    [idx, filters, filtered],
  );
  const found = groups.reduce((n, gr) => n + gr.stacks.reduce((m, x) => m + Object.values(x.match ?? {}).reduce((a, b) => a + b, 0), 0), 0);
  return (
    <div className={s.overview}>
      {filtered && (
        <p className={s.hintLine} role="status">
          {found
            ? `${found} risorse corrispondono ai filtri, in ${groups.reduce((n, gr) => n + gr.stacks.length, 0)} stack. Apri uno stack per vederle.`
            : "Nessuna risorsa corrisponde ai filtri."}
        </p>
      )}
      {groups.map(({ repo, stacks }) => (
        <section key={repo} className={s.repo}>
          <h3>{repo === EXTERNAL_STACK ? "Fuori dai repository letti" : repo}</h3>
          <div className={s.tiles}>
            {stacks.map(({ st, match }) => (
              <StackTile key={st.key} st={st} match={match} onOpen={() => onStack(st.key)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StackTile({ st, match, onOpen }: { st: InfraStack; match: Record<string, number> | null; onOpen: () => void }) {
  const types = Object.entries(match ?? st.counts).sort(([, a], [, b]) => b - a);
  const total = types.reduce((n, [, c]) => n + c, 0);
  const all = Object.values(st.counts).reduce((a, b) => a + b, 0);
  return (
    <button type="button" className={cx(s.tile, match && s.tileMatch)} onClick={onOpen}>
      <span className={s.tileHead}>
        <b>{st.name}</b>
        <span className={s.muted}>
          {match ? `${total} di ${all} risorse` : `${total} risorse`}
          {!match && st.alerts ? ` · ${st.alerts} alert` : ""}
        </span>
      </span>
      <span className={s.tileTypes}>
        {types.slice(0, 8).map(([lt, n]) => (
          <span key={lt} className={s.tileType} title={`${infraType(lt).label}: ${n}`}>
            <TypeIcon ltype={lt} size="sm" />{n}
          </span>
        ))}
      </span>
      {st.stack && <span className={s.tilePath}>{st.stack}</span>}
    </button>
  );
}

function StackCanvas({
  idx,
  st,
  env,
  filters,
  selected,
  onPick,
}: {
  idx: InfraIndex;
  st: InfraStack;
  env: EaInfraEnv;
  filters: InfraFilters;
  selected: string | null;
  onPick: (id: string) => void;
}) {
  const lay = useMemo(() => layoutStack(idx, st, filters), [idx, st, filters]);
  const [allNb, setAllNb] = useState(false);
  const nb = allNb ? lay.neighbours : lay.neighbours.slice(0, NEIGHBOUR_LIMIT);
  const links = useMemo(() => visibleLinks(idx, lay), [idx, lay]);
  const viewRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);

  const draw = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const R = view.getBoundingClientRect();
    const pos = new Map<string, DOMRect>();
    view.querySelectorAll<HTMLElement>("[data-rid]").forEach((el) => pos.set(el.dataset.rid!, el.getBoundingClientRect()));
    const out: Wire[] = [];
    for (const l of links) {
      const a = pos.get(l.from);
      const b = pos.get(l.to);
      if (!a || !b) continue;
      const ax = a.left - R.left;
      const bx = b.left - R.left;
      const ay = a.top - R.top + a.height / 2;
      const by = b.top - R.top + b.height / 2;
      // leave from the side facing the target
      const [x1, x2] = bx >= ax + a.width / 2 ? [ax + a.width, bx] : [ax, bx + b.width];
      const dx = Math.max(30, Math.abs(x2 - x1) / 2) * (x2 >= x1 ? 1 : -1);
      out.push({
        d: `M${x1},${ay} C${x1 + dx},${ay} ${x2 - dx},${by} ${x2},${by}`,
        inferred: l.origin === "inferred",
        hl: !!selected && (l.from === selected || l.to === selected),
      });
    }
    setWires(out);
  }, [links, selected]);

  useLayoutEffect(() => draw(), [draw]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(view);
    return () => ro.disconnect();
  }, [draw]);

  const outer = [...new Map([...lay.outerParents.values()].map((p) => [p.id, p])).values()];
  const empty = lay.containers.length === 0 && lay.lanes.length === 0;
  return (
    <div className={s.canvas} ref={viewRef}>
      <svg className={s.wires} aria-hidden="true">
        {wires.map((w, i) => (
          <path key={i} d={w.d} className={cx(w.inferred && s.wInf, w.hl && s.wHl, selected && !w.hl && s.wFaint)} />
        ))}
      </svg>
      <div className={s.main}>
        {outer.length > 0 && (
          <p className={s.outer}>
            Contenute anche in:{" "}
            {outer.map((p) => (
              <button key={p.id} type="button" className={s.chip} onClick={() => onPick(p.id)}>
                <TypeIcon ltype={p.ltype} size="sm" />{p.label}
              </button>
            ))}
          </p>
        )}
        {empty && <p className={s.muted}>Nessuna risorsa corrisponde ai filtri.</p>}
        {lay.containers.map((b) => (
          <ContainerBox key={b.res.id} box={b} env={env} selected={selected} onPick={onPick} />
        ))}
        {lay.lanes.map((lane) => (
          <section key={lane.ltype} className={s.lane} aria-label={infraType(lane.ltype).label}>
            <h4><TypeIcon ltype={lane.ltype} size="sm" /> {infraType(lane.ltype).label} <span className={s.muted}>{lane.items.length}</span></h4>
            <div className={s.grid}>
              {lane.items.map((r) => (
                <ResourceCard key={r.id} r={r} env={env} on={selected === r.id} dim={false} onPick={onPick} />
              ))}
            </div>
          </section>
        ))}
      </div>
      {lay.neighbours.length > 0 && (
        <aside className={s.side} aria-label="Risorse di altri stack collegate">
          <h4>Collegate da altri stack <span className={s.muted}>{lay.neighbours.length}</span></h4>
          {nb.map((r) => (
            <ResourceCard key={r.id} r={r} env={env} on={selected === r.id} dim={false} onPick={onPick} />
          ))}
          {lay.neighbours.length > NEIGHBOUR_LIMIT && (
            <button type="button" className={s.more} onClick={() => setAllNb((v) => !v)}>
              {allNb ? "Mostra meno" : `Mostra tutte (${lay.neighbours.length})`}
            </button>
          )}
        </aside>
      )}
    </div>
  );
}

const LAYER_CARD_LIMIT = 20;

/** Domain summary inside a layer when there are too many resources to list. */
function DomainTile({ domain, items, onOpen }: { domain: string; items: EaInfraResource[]; onOpen: () => void }) {
  const counts = new Map<string, number>();
  for (const r of items) counts.set(r.ltype, (counts.get(r.ltype) ?? 0) + 1);
  return (
    <button type="button" className={s.domTile} onClick={onOpen} title={`Apri il dominio ${domainLabel(domain)}`}>
      <span className={s.domTileHead}>
        <b>{domainLabel(domain)}</b>
        <span className={s.domTileN}>{items.length}</span>
      </span>
      <span className={s.domTypes}>
        {[...counts.entries()].map(([lt, n]) => (
          <span key={lt} className={s.tileType} title={`${infraType(lt).label}: ${n}`}><TypeIcon ltype={lt} size="sm" />{n}</span>
        ))}
      </span>
    </button>
  );
}

function LayersView({
  idx,
  env,
  domain,
  filters,
  selected,
  onPick,
  onDomain,
}: {
  idx: InfraIndex;
  env: EaInfraEnv;
  domain: string | null;
  filters: InfraFilters;
  selected: string | null;
  onPick: (id: string) => void;
  onDomain: (d: string | null) => void;
}) {
  const lv = useMemo(() => layeredView(idx, domain, filters), [idx, domain, filters]);
  const near = useMemo(() => (selected ? connected(idx, selected) : null), [idx, selected]);
  const viewRef = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<string[]>([]);

  const draw = useCallback(() => {
    const view = viewRef.current;
    if (!view || !selected || !near) {
      setWires([]);
      return;
    }
    const R = view.getBoundingClientRect();
    const box = (id: string) => view.querySelector<HTMLElement>(`[data-rid="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    const a = box(selected);
    if (!a) {
      setWires([]);
      return;
    }
    const out: string[] = [];
    for (const id of near) {
      const b = box(id);
      if (!b) continue;
      const ax = a.left - R.left + a.width / 2;
      const bx = b.left - R.left + b.width / 2;
      if (Math.abs(a.top - b.top) < 8) {
        const y = a.top - R.top;
        out.push(`M${ax},${y} C${ax},${y - 26} ${bx},${y - 26} ${bx},${y}`);
        continue;
      }
      const down = b.top > a.top;
      const ay = (down ? a.bottom : a.top) - R.top;
      const by = (down ? b.top : b.bottom) - R.top;
      const dy = (by - ay) / 2;
      out.push(`M${ax},${ay} C${ax},${ay + dy} ${bx},${by - dy} ${bx},${by}`);
    }
    setWires(out);
  }, [selected, near]);

  useLayoutEffect(() => draw(), [draw, lv]);
  useEffect(() => {
    const view = viewRef.current;
    if (!view || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(view);
    return () => ro.disconnect();
  }, [draw]);

  const dim = (id: string) => !!near && id !== selected && !near.has(id);
  return (
    <>
      <div className={s.domains} role="group" aria-label="Dominio">
        <button type="button" aria-pressed={domain === null} className={cx(s.domChip, domain === null && s.domChipOn)}
          onClick={() => onDomain(null)}>
          Tutti i domini
        </button>
        {lv.domains.map((d) => (
          <button key={d.key} type="button" aria-pressed={domain === d.key}
            className={cx(s.domChip, domain === d.key && s.domChipOn)} onClick={() => onDomain(domain === d.key ? null : d.key)}>
            {domainLabel(d.key)} <span className={s.domN}>{d.n}</span>
          </button>
        ))}
      </div>
      <p className={s.hintLine}>
        {domain
          ? `Il dominio ${domainLabel(domain)} dall'alto verso il basso; in fondo a ogni livello le risorse condivise che usa. Clicca una risorsa per vedere a cosa è collegata.`
          : "La piattaforma dall'alto verso il basso. Scegli un dominio, qui sopra o da un riquadro, per vedere la sua fetta verticale."}
      </p>
      <div className={s.layers} ref={viewRef}>
        <svg className={s.wires} aria-hidden="true">
          {wires.map((d, i) => <path key={i} d={d} className={cx(s.wHl, s.wFlow)} />)}
        </svg>
        <div className={s.entry} aria-label="Chi usa la piattaforma">
          {ENTRY_ACTORS.map(({ icon: Icon, label }) => (
            <span key={label} className={s.actor}><Icon aria-hidden="true" />{label}</span>
          ))}
        </div>
        {lv.layers.map((l, i) => {
          const tiles = !domain && l.total > LAYER_CARD_LIMIT;
          const st = LAYER_STYLE[l.key];
          const LayerIcon = st.icon;
          return (
            <section key={l.key} className={cx(s.layer, l.total === 0 && s.layerEmpty)} aria-label={`Livello ${l.title}`}
              style={{ "--lc": st.color } as CSSProperties}>
              <header className={s.layerHead}>
                <span className={s.layerIcon} aria-hidden="true"><LayerIcon /></span>
                <div>
                  <span className={s.layerNum}>Livello {i + 1}</span>
                  <h3>{l.title} <span className={s.layerCount}>{l.total}</span></h3>
                  <small>{l.hint}</small>
                </div>
              </header>
              <div className={s.layerBody}>
                {l.total === 0 && <span className={s.muted}>Niente in questo livello{domain ? " per il dominio" : ""}.</span>}
                {tiles
                  ? l.groups.map((gr) => (
                      <DomainTile key={gr.domain} domain={gr.domain} items={gr.items} onOpen={() => onDomain(gr.domain)} />
                    ))
                  : l.groups.map((gr) => (
                      <div key={gr.domain}
                        className={cx(s.layerGroup, domain && s.layerGroupWide, gr.domain.startsWith("shared:") && s.layerShared)}>
                        {(gr.domain.startsWith("shared:") || !domain) && (
                          <span className={s.groupLabel}>
                            {gr.domain.startsWith("shared:") ? `Condivise · ${domainLabel(gr.domain.slice(7))}` : domainLabel(gr.domain)}
                          </span>
                        )}
                        <div className={s.grid}>
                          {gr.items.map((r) => (
                            <ResourceCard key={r.id} r={r} env={env} on={selected === r.id} dim={dim(r.id)} onPick={onPick} />
                          ))}
                        </div>
                      </div>
                    ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function EaInfra({
  g,
  selected,
  onSelect,
  openNode,
}: {
  g: EaGraph;
  selected: string | null;
  onSelect: (id: string | null) => void;
  openNode: (id: string) => void;
}) {
  const [env, setEnv] = useState<EaInfraEnv>("prod");
  const [filters, setFilters] = useState<InfraFilters>(NO_INFRA_FILTERS);
  const q = useEaInfra(env);
  const idx = useMemo(() => (q.data ? buildIndex(q.data) : null), [q.data]);
  const sel = useMemo(
    () => (idx ? resolveSelection(idx, selected) : { mode: "layers" as const, domain: null, stack: null, resource: null }),
    [idx, selected],
  );
  const [panelId, setPanelId] = useState<string | null>(null);
  // a resource in the route (e.g. from a map node) opens its card
  const routed = sel.resource?.id ?? null;
  const detailId = panelId ?? routed;
  const rows = useMemo(() => {
    if (!q.data || !idx) return [];
    return sel.mode === "stacks" ? monitoringRows(q.data, idx, sel.stack) : monitoringRowsOfDomain(q.data, idx, sel.domain);
  }, [q.data, idx, sel]);
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    const list = sel.stack ? sel.stack.resources : q.data?.resources ?? [];
    for (const r of list) if (!idx?.alerts.has(r.id)) c[r.ltype] = (c[r.ltype] ?? 0) + 1;
    return Object.entries(c).sort(([, a], [, b]) => b - a);
  }, [sel.stack, q.data, idx]);

  const pick = useCallback(
    (id: string) => {
      setPanelId(id);
      const r = idx?.byId.get(id);
      if (!r || !idx) return;
      // a resource of another stack (or domain): move there, keeping the card open
      if (sel.mode === "stacks" && sel.stack && !sel.stack.resources.includes(r)) onSelect(id);
    },
    [idx, sel, onSelect],
  );
  const closePanel = useCallback(() => {
    setPanelId(null);
    if (!routed) return;
    if (sel.mode === "stacks" && sel.stack) onSelect(`stk:${sel.stack.key}`);
    else onSelect(sel.domain ? `dom:${sel.domain}` : null);
  }, [routed, sel, onSelect]);
  // a stack, a domain or the other view replaces the content above the click: bring its top
  // into view, otherwise a click on a tile far down the page seems to do nothing
  const contentRef = useRef<HTMLDivElement>(null);
  const place = `${sel.mode}|${sel.stack?.key ?? ""}|${sel.domain ?? ""}`;
  const lastPlace = useRef(place);
  useEffect(() => {
    if (lastPlace.current === place) return;
    lastPlace.current = place;
    const el = contentRef.current;
    if (!el || el.getBoundingClientRect().top >= 0) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [place]);
  const setDomain = useCallback(
    (d: string | null) => {
      setPanelId(null);
      onSelect(d ? `dom:${d}` : null);
    },
    [onSelect],
  );

  if (q.isLoading) return <p className="text-sm text-text-muted">Caricamento dell&apos;infrastruttura…</p>;
  if (q.isError || !q.data || !idx) {
    return (
      <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        Impossibile caricare la vista dell&apos;infrastruttura.
      </div>
    );
  }
  const data = q.data;
  const stats = {
    resources: data.resources.filter((r) => !r.external && !idx.alerts.has(r.id)).length,
    stacks: [...idx.stacks.keys()].filter((k) => k !== EXTERNAL_STACK).length,
    explicit: data.links.filter((l) => l.origin === "explicit").length,
    inferred: data.links.filter((l) => l.origin === "inferred").length,
    alerts: data.monitoring.alerts.length,
    groups: data.monitoring.action_groups.length,
  };
  const stackMode = sel.mode === "stacks";
  const selectedRes = detailId ? idx.byId.get(detailId) : undefined;

  return (
    <div className={s.infra}>
      <p className={s.intro}>
        L&apos;infrastruttura della piattaforma pagamenti ricostruita dal Terraform dei repository{" "}
        <code>pagopa-infra</code>, <code>pagopa-infra-core</code> e <code>pagopa-aws-infra</code>, aggiornata con la
        sincronizzazione della mappa. Due modi di guardarla: <b>per livelli</b>, dall&apos;ingresso ai dati, oppure{" "}
        <b>per stack Terraform</b>, con ogni risorsa e i suoi contenitori.
      </p>

      <div className={s.toolbar} ref={contentRef}>
        <div className={s.envs} role="radiogroup" aria-label="Vista">
          <button type="button" role="radio" aria-checked={!stackMode} className={cx(s.env, !stackMode && s.envOn)}
            onClick={() => { setPanelId(null); onSelect(null); }}>
            Per livelli
          </button>
          <button type="button" role="radio" aria-checked={stackMode} className={cx(s.env, stackMode && s.envOn)}
            onClick={() => { setPanelId(null); onSelect("stk:"); }}>
            Per stack Terraform
          </button>
        </div>
        <div className={s.envs} role="radiogroup" aria-label="Ambiente">
          {data.envs.map((e) => (
            <button key={e} type="button" role="radio" aria-checked={env === e} className={cx(s.env, env === e && s.envOn)}
              onClick={() => { setEnv(e); setPanelId(null); }}>
              {ENV_LABEL[e]}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={s.search}
          aria-label="Cerca una risorsa"
          placeholder="Cerca risorsa, nome Azure, tipo…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        {data.synced_at && (
          <span className={s.muted}>Sincronizzata il {new Date(data.synced_at).toLocaleString("it-IT")}</span>
        )}
      </div>

      <div className={s.stats}>
        <div className={s.stat}><b>{stats.resources}</b><span>risorse</span></div>
        <div className={s.stat}><b>{stats.stacks}</b><span>stack Terraform</span></div>
        <div className={s.stat}><b>{stats.explicit}</b><span>collegamenti espliciti</span></div>
        <div className={s.stat}><b>{stats.inferred}</b><span>collegamenti dedotti</span></div>
        <div className={s.stat}><b>{stats.alerts}</b><span>alert</span></div>
        <div className={s.stat}><b>{stats.groups}</b><span>action group</span></div>
      </div>

      {stackMode && (
        <div className={s.chips} role="group" aria-label="Filtra per tipo">
          {typeCounts.slice(0, 16).map(([lt, n]) => {
            const on = filters.ltypes.has(lt);
            return (
              <button key={lt} type="button" aria-pressed={on} className={cx(s.typeChip, on && s.typeChipOn)}
                onClick={() => setFilters((f) => {
                  const next = new Set(f.ltypes);
                  if (on) next.delete(lt);
                  else next.add(lt);
                  return { ...f, ltypes: next };
                })}>
                <TypeIcon ltype={lt} size="sm" /> {infraType(lt).label} <span className={s.muted}>{n}</span>
              </button>
            );
          })}
          {(filters.ltypes.size > 0 || filters.q) && (
            <button type="button" className={s.typeChip} onClick={() => setFilters(NO_INFRA_FILTERS)}>Azzera filtri</button>
          )}
        </div>
      )}

      {data.resources.length === 0 ? (
        <div role="status" className={s.empty}>
          Nessuna risorsa per {ENV_LABEL[env]}. L&apos;infrastruttura arriva con la prossima sincronizzazione della mappa
          (pulsante &quot;Sincronizza ora&quot;).
        </div>
      ) : !stackMode ? (
        <>
          <LayersView idx={idx} env={env} domain={sel.domain} filters={filters} selected={detailId}
            onPick={pick} onDomain={setDomain} />
          {selectedRes && (
            <p className={s.muted}>
              Per i dettagli Terraform (subnet, code, policy…) apri lo stack{" "}
              <button type="button" className={s.link} onClick={() => onSelect(`stk:${selectedRes.external ? EXTERNAL_STACK : `${selectedRes.repo}:${selectedRes.stack}`}`)}>
                {selectedRes.external ? "delle risorse fuori dai repo letti" : selectedRes.stack}
              </button>.
            </p>
          )}
          <MonitoringBand rows={rows} title={sel.domain ? domainLabel(sel.domain) : `tutto ${ENV_LABEL[env]}`} onPick={pick} />
        </>
      ) : sel.stack ? (
        <>
          <nav className={s.crumbs} aria-label="Percorso">
            <button type="button" className={s.link} onClick={() => onSelect("stk:")}>Tutti gli stack</button>
            <span aria-hidden="true">/</span>
            {sel.stack.repo && <span className={s.muted}>{sel.stack.repo}</span>}
            {sel.stack.repo && <span aria-hidden="true">/</span>}
            <b>{sel.stack.stack || sel.stack.name}</b>
          </nav>
          <div className={s.legend}>
            <span><i /> riferimento esplicito</span>
            <span><i className={s.lInf} /> dedotto</span>
            <span>I riquadri sono contenitori: resource group, VNet e subnet, cluster e namespace.</span>
          </div>
          <StackCanvas idx={idx} st={sel.stack} env={env} filters={filters} selected={detailId} onPick={pick} />
          <MonitoringBand rows={rows} title={sel.stack.name} onPick={pick} />
        </>
      ) : (
        <>
          <Overview idx={idx} filters={filters} onStack={(key) => onSelect(`stk:${key}`)} />
          <MonitoringBand rows={rows} title={`tutto ${ENV_LABEL[env]}`} onPick={pick} />
        </>
      )}

      {detailId && <ResourcePanel id={detailId} g={g} onClose={closePanel} onPick={pick} openNode={openNode} />}
    </div>
  );
}
