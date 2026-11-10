import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildGraph } from "@/lib/ea-map/graph";
import type { EaKb, EaLive } from "@/types/ea";
import { EaLivePanel, runKind, runReportHref } from "./EaLivePanel";

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
    { test_object: "wisp", status: "failed", trigger: "CRON", at: new Date().toISOString(), failed: 3, total: 20, allure_url: "https://allure/x", run_id: "run-1", origin: "TAS", nodes: ["pagopa-wisp-converter"] },
    { test_object: "checkout", status: "passed", trigger: "CRON", at: null, failed: 0, total: 20, allure_url: null, run_id: "run-2", origin: "QG", nodes: [] },
    { test_object: "ci-only", status: "passed", trigger: "CI_PIPELINE", at: null, failed: 0, total: 5, allure_url: "https://allure/y", run_id: "run-3", origin: "GHA", nodes: [] },
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

  it("links each run to its report in the Hub, in a new tab, instead of Allure", () => {
    render(<EaLivePanel g={buildGraph(KB)} env="DEV" onEnv={() => {}} data={DATA} loading={false} error={false} onShow={() => {}} />);
    const tas = screen.getByRole("link", { name: "Apri il report della run wisp" });
    expect(tas).toHaveAttribute("href", "/tas-nrts/report/run-1");
    expect(tas).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Apri il report della run checkout" })).toHaveAttribute("href", "/quality-gate/report/run-2");
    // Every other origin is an NRT run: the NRT report. Allure is never linked from here.
    expect(screen.getByRole("link", { name: "Apri il report della run ci-only" })).toHaveAttribute("href", "/nrts/report/run-3");
    expect(screen.queryByTitle("Report Allure")).not.toBeInTheDocument();
  });

  it("tells NRT, TAS and Quality Gate runs apart by origin, as the /nrts list does", () => {
    expect(runKind("TAS")).toBe("TAS");
    expect(runKind("QG")).toBe("QG");
    expect(runKind("GHA")).toBe("NRT");
    expect(runKind(null)).toBe("NRT");
    render(<EaLivePanel g={buildGraph(KB)} env="DEV" onEnv={() => {}} data={DATA} loading={false} error={false} onShow={() => {}} />);
    expect(screen.getAllByTitle("Tipo di run (dall'origine)").map((e) => e.textContent)).toEqual(["TAS", "QG", "NRT"]);
  });

  it("builds no report link without a run id", () => {
    expect(runReportHref({ run_id: null, origin: "TAS" })).toBeNull();
    expect(runReportHref({ origin: "QG" })).toBeNull();
    expect(runReportHref({ run_id: "x", origin: null })).toBe("/nrts/report/x");
  });

  it("says when there are no runs", () => {
    render(<EaLivePanel g={buildGraph(KB)} env="PROD" onEnv={() => {}} data={{ ...DATA, env: "PROD", feed: [] }} loading={false} error={false} onShow={() => {}} />);
    expect(screen.getByText("Nessuna run in PROD negli ultimi 7 giorni.")).toBeTruthy();
  });
});
