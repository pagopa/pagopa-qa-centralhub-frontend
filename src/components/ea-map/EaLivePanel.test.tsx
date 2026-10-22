import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaKb, EaLive } from "@/types/ea";
import { EaLivePanel } from "./EaLivePanel";

const KB = {
  meta: {},
  nodes: [
    { id: "area:pay", type: "area", name: "Pagamento", desc: "" },
    { id: "prod:wisp", type: "product", parent: "area:pay", name: "WISP", desc: "", domain: null, conf: [] },
    { id: "pagopa-wisp-converter", type: "component", parent: "prod:wisp", name: "WISP Converter", desc: "" },
  ],
  edges: [],
  blueprint: { segments: [], services: [], functions: [], processes: [], infra: [], prodInfra: {}, risk: {}, riskSrc: null, panels: {} },
} as unknown as EaKb;

const DATA = {
  env: "DEV",
  days: 7,
  generated_at: new Date().toISOString(),
  objects: [],
  nodes: {},
  unmapped: ["demo-non-mappato"],
  feed: [
    { test_object: "wisp", status: "failed", trigger: "CRON", at: new Date().toISOString(), failed: 3, total: 20, allure_url: "https://allure/x", nodes: ["pagopa-wisp-converter"] },
    { test_object: "checkout", status: "passed", trigger: "CRON", at: null, failed: 0, total: 20, allure_url: null, nodes: [] },
  ],
  counts: { passed: 1, partial: 0, failed: 1 },
} as EaLive;

describe("EaLivePanel", () => {
  it("shows counts, the latest runs with their nodes and the unmapped objects", () => {
    const onShow = vi.fn();
    const onEnv = vi.fn();
    render(<EaLivePanel g={buildGraph(KB)} env="DEV" onEnv={onEnv} data={DATA} loading={false} error={false} onShow={onShow} />);
    expect(screen.getByTitle("Ultimo esito fallito")).toHaveTextContent("✗ 1");
    expect(screen.getByText("WISP Converter")).toBeTruthy();
    expect(screen.getByText(/3\/20 scenari ko/)).toBeTruthy();
    expect(screen.getByText(/Non collegati alla mappa · 1/)).toBeTruthy();
    fireEvent.click(screen.getByTitle("Mostra sulla mappa"));
    expect(onShow).toHaveBeenCalledWith(["pagopa-wisp-converter"]);
    fireEvent.change(screen.getByLabelText("Ambiente"), { target: { value: "UAT" } });
    expect(onEnv).toHaveBeenCalledWith("UAT");
  });

  it("says when there are no runs", () => {
    render(<EaLivePanel g={buildGraph(KB)} env="PROD" onEnv={() => {}} data={{ ...DATA, env: "PROD", feed: [] }} loading={false} error={false} onShow={() => {}} />);
    expect(screen.getByText("Nessuna run in PROD negli ultimi 7 giorni.")).toBeTruthy();
  });
});
