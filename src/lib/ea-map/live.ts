/* «Live»: turn the outcomes of the test runs into a status per map node (components,
   then products and areas as the worst of what they contain) and into the CSS that
   paints it on every view. Pure functions, tested. */

import type { EaLive, EaLiveStatus } from "@/types/ea";
import { areaOf, type EaGraph } from "./graph";

const ORDER: Record<EaLiveStatus, number> = { none: 0, passed: 1, partial: 2, failed: 3 };
const worse = (a: EaLiveStatus, b: EaLiveStatus) => (ORDER[b] > ORDER[a] ? b : a);

export interface LiveMark {
  status: EaLiveStatus;
  fresh: boolean;
}

export function liveMarks(g: EaGraph, live: EaLive): Map<string, LiveMark> {
  const out = new Map<string, LiveMark>();
  const add = (id: string, status: EaLiveStatus, fresh: boolean) => {
    const cur = out.get(id);
    out.set(id, cur ? { status: worse(cur.status, status), fresh: cur.fresh || fresh } : { status, fresh });
  };
  for (const [id, v] of Object.entries(live.nodes)) {
    const n = g.byId.get(id);
    if (!n) continue;
    add(id, v.status, v.fresh_failure);
    if (n.type === "component") add(n.parent, v.status, v.fresh_failure);
    const area = areaOf(g, n);
    if (area) add(area.id, v.status, v.fresh_failure);
  }
  return out;
}

const COLOR: Record<Exclude<EaLiveStatus, "none">, string> = {
  passed: "#2f9a69",
  partial: "#dd7f2e",
  failed: "#c8483f",
};

const sel = (id: string) => {
  const v = `"${id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `[data-nid=${v}],[data-bp=${v}]`;
};

/** A colored ring per node; failures of the last 24 hours also pulse. */
export function liveCss(marks: Map<string, LiveMark>, scope: string): string {
  const rules: string[] = [
    "@keyframes ea-live-pulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(200, 72, 63, 0.9), 0 0 0 0 rgba(200, 72, 63, 0.5); } " +
      "50% { box-shadow: 0 0 0 3px rgba(200, 72, 63, 0.9), 0 0 0 10px rgba(200, 72, 63, 0); } }",
  ];
  for (const [id, m] of marks) {
    if (m.status === "none") continue;
    const c = COLOR[m.status];
    rules.push(
      `.${scope} :is(${sel(id)}) { box-shadow: 0 0 0 3px ${c}; position: relative; }` +
        (m.fresh ? ` .${scope} :is(${sel(id)}) { animation: ea-live-pulse 1.4s ease-in-out infinite; }` : ""),
    );
  }
  return rules.length > 1 ? rules.join("\n") : "";
}

/** "3 min fa", "2 h fa", "ieri"… */
export function ago(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "—";
  const s = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "adesso";
  if (s < 3600) return `${Math.round(s / 60)} min fa`;
  if (s < 86400) return `${Math.round(s / 3600)} h fa`;
  const d = Math.round(s / 86400);
  return d === 1 ? "ieri" : `${d} giorni fa`;
}
