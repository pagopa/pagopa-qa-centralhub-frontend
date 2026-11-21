import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlRebaseView } from "@/types/test-lifecycle";
import { RebaseDialog } from "./RebaseDialog";

const mocks = vi.hoisted(() => ({ view: null as unknown }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlRebase: () => ({ data: mocks.view, isLoading: false, isError: false }),
}));

function content(steps: string) {
  return {
    position: 1, title: "Paga", kind: "scenario", polarity: "positivo",
    extra_tags: [], steps, examples: null, detail_link: null,
  };
}

const VIEW: TlRebaseView = {
  revision_id: "r2",
  base_revision_id: "r1",
  published_revision_id: "r3",
  lock_version: 5,
  metadata: [
    { field: "title", base: "Paga", git: "Paga", draft: "Paga", conflict: false },
    { field: "description", base: null, git: "Nuova", draft: null, conflict: false },
    { field: "background", base: null, git: null, draft: null, conflict: false },
  ],
  scenarios: [
    {
      scenario_id: "s1", tag: "@FDR3_001_01",
      base: content("Dato a\nQuando paga"),
      git: content("Dato a\nQuando paga col bonifico"),
      draft: content("Dato a\nQuando paga con carta"),
      conflict: true,
    },
    {
      scenario_id: "s2", tag: "@FDR3_001_02",
      base: content("Dato b"), git: content("Dato b ok"), draft: content("Dato b"), conflict: false,
    },
  ],
} as TlRebaseView;

function renderDialog(onApply = vi.fn().mockResolvedValue(undefined)) {
  render(<RebaseDialog open onOpenChange={vi.fn()} featureId="f1" revisionId="r2" onApply={onApply} />);
  return onApply;
}

describe("RebaseDialog", () => {
  beforeEach(() => {
    mocks.view = VIEW;
  });

  it("keeps Applica disabled until every conflict has a choice", async () => {
    const onApply = renderDialog();
    const apply = screen.getByRole("button", { name: "Applica" });
    expect(apply).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: /Usa Git.*@FDR3_001_01/ }));
    expect(apply).toBeEnabled();
    await userEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith({ s1: "git" });
  });

  it("shows non-conflicting changes as already resolved without asking", () => {
    renderDialog();
    expect(screen.queryByRole("radio", { name: /@FDR3_001_02/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Preso da Git").length).toBeGreaterThan(0);
  });

  it("lists the conflicts returned by a 409 rebase_required", async () => {
    const onApply = vi.fn().mockRejectedValue(
      new ApiError(409, { detail: { code: "rebase_required", message: "Scegli", conflicts: ["s1", "title"] } }),
    );
    renderDialog(onApply);
    await userEvent.click(screen.getByRole("radio", { name: /Mantieni bozza.*@FDR3_001_01/ }));
    await userEvent.click(screen.getByRole("button", { name: "Applica" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("@FDR3_001_01");
    expect(screen.getByRole("alert")).toHaveTextContent("Titolo");
  });
});
