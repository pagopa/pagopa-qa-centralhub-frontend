/* Helpers shared by the map assistant and the release impact tab: highlighting nodes on
   whatever view is open, choosing where to show them, and rendering the assistant's
   answers (light markdown plus [[node-id]] references). Pure functions, tested. */

import { ApiError } from "@/lib/api";
import { areaOf, type EaGraph, type EaRoute } from "./graph";

/** The ids to light up: the nodes themselves plus the product and area that contain them,
 * so a highlight is visible even on the higher-level views. */
export function expandHighlight(g: EaGraph, ids: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    const n = g.byId.get(id);
    if (!n) continue;
    if (n.type === "component") out.add(n.parent);
    const area = areaOf(g, n);
    if (area) out.add(area.id);
  }
  return out;
}

const cssString = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** CSS that lights the nodes up on every view: map nodes carry data-nid, blueprint items data-bp. */
export function highlightCss(ids: Iterable<string>, className: string): string {
  const sel = [...ids].flatMap((id) => [`[data-nid=${cssString(id)}]`, `[data-bp=${cssString(id)}]`]);
  if (!sel.length) return "";
  return (
    "@keyframes ea-hl-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 138, 61, 0.55); } " +
    "50% { box-shadow: 0 0 0 8px rgba(255, 138, 61, 0); } } " +
    `.${className} :is(${sel.join(",")}) { animation: ea-hl-pulse 1.8s ease-in-out infinite; ` +
    "outline: 2px solid #ff8a3d; outline-offset: 2px; position: relative; z-index: 1; }"
  );
}

/** Where the highlighted nodes are best seen. */
export function bestRoute(g: EaGraph, ids: string[]): EaRoute {
  const nodes = ids.map((id) => g.byId.get(id)).filter((n) => n !== undefined);
  const bpOnly = ids.length > 0 && nodes.length === 0 && ids.some((id) => /^(sv|pr|seg|fn)-/.test(id));
  if (bpOnly) return { view: "blueprint", nodeId: null };
  const comps = nodes.filter((n) => n.type === "component");
  const datasets = nodes.filter((n) => n.type === "dataset");
  if (datasets.length > comps.length) return { view: "datalake", nodeId: null };
  const products = new Set([
    ...comps.map((c) => c.parent),
    ...nodes.filter((n) => n.type === "product").map((n) => n.id),
  ]);
  if (products.size === 1) return { view: "map", nodeId: [...products][0] };
  return { view: "map", nodeId: null };
}

export type Inline = { t: "text"; v: string } | { t: "bold"; v: string } | { t: "ref"; id: string };
export type Block = { t: "p"; inl: Inline[] } | { t: "ul"; items: Inline[][] };

function inline(text: string): Inline[] {
  const out: Inline[] = [];
  const rx = /\[\[([^\[\]]+)\]\]|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const m of text.matchAll(rx)) {
    if (m.index! > last) out.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "ref", id: m[1] });
    else out.push({ t: "bold", v: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/** Paragraphs and "- " / "* " bullet lists, with **bold** and [[node-id]] references. */
export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ t: "p", inl: inline(para.join(" ")) });
    para = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last && last.t === "ul") last.items.push(inline(bullet[2]));
      else blocks.push({ t: "ul", items: [inline(bullet[2])] });
    } else if (!line) flush();
    else para.push(line.replace(/^#+\s*/, ""));
  }
  flush();
  return blocks;
}

/** The message to show for a failed call: the backend's detail when there is one. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    if (err.status === 422) return "Richiesta non valida";
  }
  return fallback;
}

export const RISK_LABEL: Record<string, string> = { alto: "Alto", medio: "Medio", basso: "Basso", nessuno: "Nessuno" };
