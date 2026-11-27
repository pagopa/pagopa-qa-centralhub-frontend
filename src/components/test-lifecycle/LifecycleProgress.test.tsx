import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LifecycleProgress, progressSteps } from "./LifecycleProgress";
import type { TlFeatureStatus, TlRevisionStatus } from "@/types/test-lifecycle";

type Input = Parameters<typeof progressSteps>[0];

const rev = (status: TlRevisionStatus) => ({ status }) as NonNullable<Input["working_revision"]>;
const input = (
  status: TlFeatureStatus,
  working: TlRevisionStatus | null,
  published: TlRevisionStatus | null = null,
): Input => ({
  status,
  working_revision: working ? rev(working) : null,
  published_revision: published ? rev(published) : null,
});
const states = (i: Input) => progressSteps(i).map((s) => s.state);

describe("progressSteps", () => {
  it("has the four steps in order", () => {
    expect(progressSteps(input("draft", "draft")).map((s) => s.label)).toEqual([
      "Bozza", "In review", "Progettata", "Implementata",
    ]);
  });

  it("marks Bozza as current for a draft revision", () => {
    expect(states(input("draft", "draft"))).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
  });

  it("marks In review as current and Bozza as done", () => {
    expect(states(input("in_review", "in_review"))).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("marks Progettata as current for an approved revision", () => {
    expect(states(input("designed", "approved"))).toEqual(["done", "done", "current", "upcoming"]);
  });

  it("marks Implementata as current for a merged or superseded revision", () => {
    expect(states(input("implemented", null, "merged"))).toEqual(["done", "done", "done", "current"]);
    expect(states(input("implemented", null, "superseded"))).toEqual(["done", "done", "done", "current"]);
  });

  it("shows a reopened draft of an implemented feature as Bozza", () => {
    expect(states(input("implemented", "draft", "merged"))).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
  });

  it("keeps Implementata as the last step also when the feature is running (it is a badge)", () => {
    const steps = progressSteps(input("running", null, "merged"));
    expect(steps[3]).toEqual({ label: "Implementata", state: "current" });
  });

  it("has Bozza current when the feature has no revision", () => {
    expect(states(input("draft", null))).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
  });
});

describe("LifecycleProgress", () => {
  it("exposes the current step to assistive technology", () => {
    render(<LifecycleProgress feature={input("in_review", "in_review")} />);
    const list = screen.getByRole("list", { name: "Avanzamento della feature" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items.filter((li) => li.hasAttribute("aria-current"))).toHaveLength(1);
    expect(items[0]).toHaveTextContent("completato");
    expect(items[2]).not.toHaveTextContent("completato");
  });

  it("keeps the list semantics and wraps instead of scrolling on narrow screens", () => {
    render(<LifecycleProgress feature={input("draft", "draft")} />);
    const list = screen.getByRole("list", { name: "Avanzamento della feature" });
    expect(list).toHaveAttribute("role", "list");
    expect(list.className).toContain("flex-wrap");
    expect(list.className).not.toContain("overflow-x-auto");
  });
});
