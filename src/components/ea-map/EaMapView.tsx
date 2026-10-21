"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EyeOff, Search } from "lucide-react";
import type { EaArea, EaNode, EaProduct } from "@/types/ea";
import { useEaKb, useEaSyncStatus } from "@/hooks/useEaMap";
import { usePermissions } from "@/hooks/usePermissions";
import {
  KIND_BADGE,
  buildGraph,
  decodeRoute,
  encodeRoute,
  productOf,
  searchNodes,
  shortName,
  type EaGraph,
  type EaRoute,
  type EaView,
} from "@/lib/ea-map/graph";
import { AreaView, PlatformView, ProductView } from "./EaArchitecture";
import { EaBlueprint } from "./EaBlueprint";
import { bestRoute, expandHighlight, highlightCss } from "@/lib/ea-map/assist";
import { EaAssistant } from "./EaAssistant";
import { EaDataLake } from "./EaDataLake";
import { EaGuide } from "./EaGuide";
import { EaImpact } from "./EaImpact";
import { EaNodeDrawer } from "./EaNodeDrawer";
import { EaQaMatrix } from "./EaQaMatrix";
import { EaReview, EaSyncBar } from "./EaReview";
import { cx } from "./shared";
import s from "./ea-map.module.css";
import sa from "./ea-assist.module.css";

const TABS: [EaView, string][] = [
  ["blueprint", "Blueprint"],
  ["map", "Architettura"],
  ["datalake", "Data Lake"],
  ["impact", "Impatto"],
  ["qa", "Matrice QA"],
  ["guida", "Guida"],
  ["review", "Revisione"],
];
const LENS_KEY = "ea-map-lens";
/** Global class (not a CSS module class) that scopes the highlight rules to the map. */
const HL_SCOPE = "ea-hl-scope";
const LENS_EVENT = "ea-map-lens-change";

function subscribeLens(cb: () => void) {
  window.addEventListener(LENS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LENS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readLens(): boolean {
  try {
    return window.localStorage.getItem(LENS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLens(on: boolean) {
  try {
    window.localStorage.setItem(LENS_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable: the toggle still works for this page view */
  }
  window.dispatchEvent(new Event(LENS_EVENT));
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function where(g: EaGraph, n: EaNode): string {
  if (n.type === "component") return `${shortName(productOf(g, n).name)} · ${n.id}`;
  if (n.type === "product") return g.byId.get(n.parent)?.name ?? "";
  if (n.type === "area") return "Area";
  if (n.type === "dataset") return `Data Lake · ${n.table ?? n.topic ?? n.layer}`;
  return "Sistema esterno";
}

function SearchBox({ g, onPick }: { g: EaGraph; onPick: (n: EaNode) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchNodes(g, q), [g, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (i: number) => {
    const n = hits[i];
    if (!n) return;
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
    onPick(n);
  };

  return (
    <div className={s.search}>
      <Search aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        aria-label="Cerca nella mappa"
        placeholder="Cerca prodotto, servizio, repo…  ( / )"
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !q) return;
          if (e.key === "ArrowDown") { setSel((v) => Math.min(v + 1, hits.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setSel((v) => Math.max(v - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter") pick(sel);
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q && (
        <div className={s.results} role="listbox">
          {hits.length ? (
            hits.map((n, i) => (
              <button
                key={n.id}
                type="button"
                role="option"
                aria-selected={i === sel}
                className={cx(s.res, i === sel && s.resSel)}
                onMouseDown={(e) => { e.preventDefault(); pick(i); }}
              >
                <span className={s.kb}>{n.type === "component" ? KIND_BADGE[n.kind] : n.type === "product" ? "PRD" : n.type === "area" ? "AREA" : n.type === "dataset" ? "DATA" : "EXT"}</span>
                <span className={s.resT}>{n.name}</span>
                <span className={s.resP}>{where(g, n)}</span>
              </button>
            ))
          ) : (
            <div className={s.res}><span /><span className={s.resP}>Nessun risultato</span></div>
          )}
        </div>
      )}
    </div>
  );
}

export function EaMapView() {
  const kbQuery = useEaKb();
  const g = useMemo(() => (kbQuery.data ? buildGraph(kbQuery.data) : null), [kbQuery.data]);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const route = useMemo(() => decodeRoute(hash), [hash]);
  const lensStored = useSyncExternalStore(subscribeLens, readLens, () => false);
  const [lensSession, setLensSession] = useState<boolean | null>(null);
  const lens = lensSession ?? lensStored;
  // a drawer opened for a non-routed node (external, datastore, dataset) belongs to the page
  // it was opened on: back/forward or a pasted link close it
  const [external, setExternal] = useState<{ id: string; hash: string } | null>(null);
  const externalId = external && external.hash === hash.replace(/^#/, "") ? external.id : null;
  const setExternalId = useCallback(
    (id: string | null, onHash?: string) =>
      setExternal(id ? { id, hash: onHash ?? window.location.hash.replace(/^#/, "") } : null),
    [],
  );
  // nodes lit up on every view by the assistant or the release impact
  const [highlight, setHighlight] = useState<string[] | null>(null);
  const highlightStyle = useMemo(
    () => (g && highlight ? highlightCss(expandHighlight(g, highlight), HL_SCOPE) : ""),
    [g, highlight],
  );
  // Esc turns the highlight off, unless a panel or drawer is open (Esc closes that first)
  useEffect(() => {
    if (!highlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) setHighlight(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [highlight]);
  const { can } = usePermissions();
  const canReview = can("review:ea_map");
  const openChanges = useEaSyncStatus().data?.open_changes ?? 0;

  const navigate = useCallback((r: EaRoute) => {
    setExternalId(null);
    window.location.hash = encodeRoute(r);
  }, [setExternalId]);

  const goTo = useCallback((nodeId: string | null) => navigate({ view: "map", nodeId }), [navigate]);
  const openNode = useCallback(
    (id: string) => {
      const n = g?.byId.get(id);
      if (!n) return;
      if (n.type === "component") navigate({ view: "map", nodeId: id });
      else if (n.type === "product" || n.type === "area") goTo(id);
      else if (n.type === "dataset") {
        navigate({ view: "datalake", nodeId: id });
        setExternalId(id, encodeRoute({ view: "datalake", nodeId: id }));
      } else setExternalId(id);
    },
    [g, navigate, goTo, setExternalId],
  );
  // from the Data Lake view, sources and consumers open their card in place: closing it keeps
  // the user on the Data Lake instead of moving to the Architecture view
  const openInDataLake = useCallback(
    (id: string) => {
      const n = g?.byId.get(id);
      if (!n) return;
      if (n.type === "dataset") openNode(id);
      else setExternalId(id);
    },
    [g, openNode, setExternalId],
  );
  // only the Architecture view opens the card of the component in the route: in the Data Lake
  // view the route node is just the selection
  const routedComponent =
    route.view === "map" && route.nodeId && g?.byId.get(route.nodeId)?.type === "component" ? route.nodeId : null;
  const drawerId = externalId ?? routedComponent;

  const closeDrawer = useCallback(() => {
    if (externalId) {
      setExternalId(null);
      return;
    }
    const n = routedComponent ? g?.byId.get(routedComponent) : undefined;
    if (n && n.type === "component") goTo(n.parent);
  }, [externalId, routedComponent, g, goTo, setExternalId]);

  const showOnMap = useCallback(
    (ids: string[]) => {
      if (!g || !ids.length) return;
      setHighlight(ids);
      navigate(bestRoute(g, ids));
    },
    [g, navigate],
  );

  const toggleLens = () => {
    const next = !lens;
    setLensSession(next);
    writeLens(next);
  };

  if (kbQuery.isLoading) {
    return <p className="text-sm text-text-muted">Caricamento della mappa…</p>;
  }
  if (kbQuery.isError || !g) {
    const message = kbQuery.error instanceof Error ? kbQuery.error.message : "Impossibile caricare la EA Map";
    return (
      <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
        {message}
      </div>
    );
  }
  if (g.kb.nodes.length === 0) {
    return (
      <div role="status" className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-dim">
        La mappa è vuota. Un amministratore può caricarla con <code>uv run python -m scripts.ea_import</code> sul backend.
      </div>
    );
  }

  const target = route.nodeId ? g.byId.get(route.nodeId) : undefined;
  const drawerNode = drawerId ? g.byId.get(drawerId) : undefined;
  const mapContent = () => {
    if (!target) return <PlatformView g={g} goTo={goTo} openNode={openNode} />;
    if (target.type === "area") return <AreaView g={g} goTo={goTo} openNode={openNode} area={target as EaArea} />;
    if (target.type === "product") return <ProductView g={g} goTo={goTo} openNode={openNode} product={target as EaProduct} />;
    if (target.type === "component") return <ProductView g={g} goTo={goTo} openNode={openNode} product={productOf(g, target)} />;
    return <PlatformView g={g} goTo={goTo} openNode={openNode} />;
  };

  return (
    <div className={cx(s.root, lens && s.lensOn, HL_SCOPE)}>
      {highlightStyle && <style>{highlightStyle}</style>}
      <div className={s.toolbar}>
        <div className={s.tabs} role="tablist" aria-label="Viste della mappa">
          {TABS.filter(([v]) => v !== "review" || canReview).map(([v, l]) => (
            <button key={v} type="button" role="tab" className={s.tab} aria-selected={route.view === v}
              onClick={() => navigate({ view: v, nodeId: null })}>
              {l}
              {v === "review" && openChanges > 0 && <span className={s.tabBadge}>{openChanges}</span>}
            </button>
          ))}
        </div>
        <div className={s.lens}>
          <button id="ea-lens" type="button" role="switch" className={s.switch} aria-checked={lens} aria-label="Lente QA" onClick={toggleLens} />
          <label htmlFor="ea-lens">Lente QA</label>
        </div>
        <SearchBox g={g} onPick={(n) => openNode(n.id)} />
      </div>
      <EaSyncBar onReview={() => navigate({ view: "review", nodeId: null })} />

      {route.view === "blueprint" && <EaBlueprint g={g} goTo={goTo} openNode={openNode} />}
      {route.view === "map" && mapContent()}
      {route.view === "datalake" && (
        <EaDataLake
          g={g}
          selected={route.nodeId}
          onSelect={(id) => navigate({ view: "datalake", nodeId: id })}
          onOpen={openInDataLake}
        />
      )}
      {route.view === "impact" && <EaImpact g={g} openNode={openNode} onShow={showOnMap} />}
      {route.view === "qa" && <EaQaMatrix g={g} goTo={goTo} openNode={openNode} />}
      {route.view === "guida" && <EaGuide g={g} goTo={goTo} />}
      {route.view === "review" && <EaReview g={g} goTo={goTo} onOpen={openNode} />}

      {drawerNode && <EaNodeDrawer g={g} node={drawerNode} onClose={closeDrawer} onOpen={openNode} goTo={goTo} />}
      {highlight && (
        <div className={sa.hlBar} role="status">
          <span className={sa.hlDot} aria-hidden="true" />
          <span>
            {highlight.length} {highlight.length === 1 ? "elemento evidenziato" : "elementi evidenziati"} sulla mappa
          </span>
          <button type="button" onClick={() => setHighlight(null)}>
            <EyeOff aria-hidden="true" /> Spegni <kbd>Esc</kbd>
          </button>
        </div>
      )}
      <EaAssistant
        g={g}
        route={route}
        highlightOn={highlight !== null}
        onHighlight={setHighlight}
        onShow={showOnMap}
        openNode={openNode}
      />
    </div>
  );
}
