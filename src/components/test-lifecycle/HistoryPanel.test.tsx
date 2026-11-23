import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HistoryPanel } from "./HistoryPanel";

const mocks = vi.hoisted(() => ({
  files: { v1: "a\nb", v2: "a\nc" } as Record<string, string>,
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlHistory: () => ({
    isLoading: false,
    isError: false,
    data: [
      { kind: "version", at: "2026-11-20T11:00:00Z", actor: "a@x.it", action: null, detail: null, version_id: "v2" },
      { kind: "event", at: "2026-11-20T10:30:00Z", actor: "a@x.it", action: "tl.revision.submitted", detail: null, version_id: null },
      { kind: "event", at: "2026-11-20T10:20:00Z", actor: null, action: "tl.custom.thing", detail: null, version_id: null },
      { kind: "version", at: "2026-11-20T10:00:00Z", actor: "a@x.it", action: null, detail: null, version_id: "v1" },
    ],
  }),
  useTlVersion: (_f: string, id: string | undefined) => ({
    isLoading: false,
    isError: false,
    data: id ? { id, snapshot: { file: mocks.files[id] } } : undefined,
  }),
}));

describe("HistoryPanel", () => {
  it("labels known events in Italian and falls back to the raw key", () => {
    render(<HistoryPanel featureId="f1" />);
    expect(screen.getByText("Revisione inviata in review")).toBeInTheDocument();
    expect(screen.getByText("tl.custom.thing")).toBeInTheDocument();
  });

  it("shows the file of a version", async () => {
    render(<HistoryPanel featureId="f1" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Vedi file" })[1]);
    expect(screen.getByLabelText("File della versione")).toHaveTextContent("a b");
  });

  it("diffs two selected versions, older to newer", async () => {
    render(<HistoryPanel featureId="f1" />);
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    const diff = screen.getByLabelText("Diff fra versioni");
    expect(diff.querySelector('[data-diff="del"]')).toHaveTextContent("b");
    expect(diff.querySelector('[data-diff="add"]')).toHaveTextContent("c");
  });
});
