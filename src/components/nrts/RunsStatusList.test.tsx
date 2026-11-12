import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { QualityGateRunResponse, QualityGateRunStatus } from "@/hooks/useQualityGate";
import { ApiError } from "@/lib/api";
import { RunsStatusList, launchErrorMessage, withPendingRun } from "./RunsStatusList";

function run(id: string, state: QualityGateRunStatus["state"], conclusion: string | null = null): QualityGateRunStatus {
  return {
    correlation_id: id,
    run_name: `tas-${id}`,
    state,
    conclusion,
    html_url: `https://github.com/x/runs/${id}`,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: null,
  };
}

describe("RunsStatusList", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<RunsStatusList runs={[]} label="Run TAS recenti" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["pending", null, "Avvio in corso…"],
    ["queued", null, "In coda"],
    ["in_progress", null, "In esecuzione"],
    ["completed", "success", "Completata con successo"],
    ["completed", "failure", "Fallita"],
    ["completed", "cancelled", "Annullata"],
  ] as const)("shows %s/%s as «%s»", (state, conclusion, label) => {
    render(<RunsStatusList runs={[run("a", state, conclusion)]} label="Run TAS recenti" />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Run TAS recenti" })).toBeInTheDocument();
    expect(screen.getByText("tas-a")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri su GitHub Actions" })).toHaveAttribute("href", "https://github.com/x/runs/a");
  });
});

describe("launchErrorMessage", () => {
  it("maps the known statuses", () => {
    expect(launchErrorMessage(new ApiError(503, null), "il TAS")).toMatch(/token GitHub mancante/);
    expect(launchErrorMessage(new ApiError(502, null), "il TAS")).toMatch(/GitHub ha rifiutato/);
    expect(launchErrorMessage(new ApiError(422, { detail: "Unknown suite(s): x" }), "il TAS")).toBe("Unknown suite(s): x");
    expect(launchErrorMessage(new ApiError(422, null), "il TAS")).toMatch(/Parametri non validi/);
  });

  it("falls back to a message naming what failed", () => {
    expect(launchErrorMessage(new Error("x"), "gli NRT")).toBe("Impossibile avviare gli NRT.");
  });
});

describe("withPendingRun", () => {
  const launched: QualityGateRunResponse = { correlation_id: "n", run_name: "tas-n", actions_url: "https://github.com/x/actions" };

  it("shows a just-launched run as pending until GitHub lists it", () => {
    const out = withPendingRun(launched, [run("old", "completed", "success")]);
    expect(out.map((r) => r.correlation_id)).toEqual(["n", "old"]);
    expect(out[0]).toMatchObject({ state: "pending", html_url: "https://github.com/x/actions" });
  });

  it("does not duplicate a run that is already listed", () => {
    const listed = [run("n", "in_progress")];
    expect(withPendingRun(launched, listed)).toEqual(listed);
  });

  it("returns the listed runs when nothing was launched", () => {
    const listed = [run("a", "queued")];
    expect(withPendingRun(undefined, listed)).toBe(listed);
  });
});
