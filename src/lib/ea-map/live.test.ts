import { describe, expect, it } from "vitest";
import type { EaKb, EaLive } from "@/types/ea";
import { buildGraph } from "./graph";
import { ago, liveCss, liveMarks } from "./live";

const KB = {
  meta: {},
  nodes: [
    { id: "area:core", type: "area", name: "Core", desc: "" },
    { id: "prod:gpd", type: "product", parent: "area:core", name: "GPD", desc: "", domain: null, conf: [] },
    { id: "a", type: "component", parent: "prod:gpd", name: "A", desc: "" },
    { id: "b", type: "component", parent: "prod:gpd", name: "B", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const live = (nodes: EaLive["nodes"]) =>
  ({ env: "UAT", days: 7, generated_at: "", objects: [], nodes, unmapped: [], feed: [], counts: { passed: 0, partial: 0, failed: 0 } }) as EaLive;

describe("live", () => {
  const g = buildGraph(KB);

  it("rolls the worst status up to product and area", () => {
    const m = liveMarks(g, live({
      a: { status: "passed", fresh_failure: false, at: null, objects: ["x"] },
      b: { status: "failed", fresh_failure: true, at: null, objects: ["y"] },
      ghost: { status: "failed", fresh_failure: true, at: null, objects: ["z"] },
    }));
    expect(m.get("a")).toEqual({ status: "passed", fresh: false });
    expect(m.get("prod:gpd")).toEqual({ status: "failed", fresh: true });
    expect(m.get("area:core")).toEqual({ status: "failed", fresh: true });
    expect(m.has("ghost")).toBe(false);
  });

  it("paints rings and pulses only fresh failures", () => {
    const css = liveCss(new Map([["a", { status: "passed", fresh: false }], ["b", { status: "failed", fresh: true }]]), "s");
    expect(css).toContain('[data-nid="a"]');
    expect(css).toContain("#2f9a69");
    expect(css.match(/animation: ea-live-pulse/g)?.length).toBe(1);
    expect(liveCss(new Map(), "s")).toBe("");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(ago("2026-10-21T11:59:30Z", now)).toBe("adesso");
    expect(ago("2026-10-21T11:40:00Z", now)).toBe("20 min fa");
    expect(ago("2026-10-21T09:00:00Z", now)).toBe("3 h fa");
    expect(ago("2026-10-20T10:00:00Z", now)).toBe("ieri");
    expect(ago(null, now)).toBe("—");
  });
});
