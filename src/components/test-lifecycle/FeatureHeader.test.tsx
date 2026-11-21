import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail } from "@/types/test-lifecycle";
import { FeatureHeader } from "./FeatureHeader";

vi.mock("@/lib/permissions", () => ({
  Gate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const FEATURE = {
  id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", scope_id: "s1", scope_code: "FdR3",
  design_owner_id: null, reviewer_id: null, impl_owner_id: null, jira_design_key: null,
  jira_impl_key: null, created_by: "a@x.it", created_at: "", updated_at: "",
  working_revision: {
    id: "r1", number: 1, status: "draft", lock_version: 3, title: "Pagamento avviso",
    description: null, background_steps: null, requirements_url: null, product_issue_key: null,
    reverse_engineering: false, design_estimate_days: null, impl_estimate_days: null,
    created_by: "a@x.it", approved_by: null, approved_at: null, created_at: "", updated_at: "",
    scenarios: [], background_errors: [], origin: "hub", pr_number: null, pr_url: null, pr_state: null, pr_error: null, base_stale: false, merged_commit_sha: null,
  },
  published_revision: null,
  git_path: null,
  open_issues: 0,
  transitions: [
    { action: "submit", allowed: false, reasons: ["Nessuno scenario", "Reviewer non assegnato"] },
    { action: "approve", allowed: false, reasons: ["La revisione non è in review"] },
    { action: "request_changes", allowed: false, reasons: ["La revisione non è in review"] },
    { action: "reopen", allowed: true, reasons: [] },
  ],
} as TlFeatureDetail;

describe("FeatureHeader", () => {
  it("shows code, title and status", () => {
    render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} />);
    expect(screen.getByText("FEAT_001_FdR3")).toBeInTheDocument();
    expect(screen.getByText("Pagamento avviso")).toBeInTheDocument();
    expect(screen.getAllByText("Bozza").length).toBeGreaterThan(0);
  });

  it("disables 'Invia in review' and exposes the reasons received", () => {
    render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} />);
    const submit = screen.getByRole("button", { name: "Invia in review" });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription(/Nessuno scenario/);
    expect(submit).toHaveAccessibleDescription(/Reviewer non assegnato/);
    expect(screen.getByText("Nessuno scenario")).toBeInTheDocument();
  });

  it("requires a note before requesting changes", async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    const feature = {
      ...FEATURE,
      transitions: FEATURE.transitions.map((t) =>
        t.action === "request_changes" ? { ...t, allowed: true, reasons: [] } : t,
      ),
    };
    render(<FeatureHeader feature={feature} onTransition={onTransition} />);
    await userEvent.click(screen.getByRole("button", { name: "Richiedi modifiche" }));
    const confirm = await screen.findByRole("button", { name: "Invia richiesta" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Nota per l'autore"), "Manca il caso negativo");
    await userEvent.click(confirm);
    expect(onTransition).toHaveBeenCalledWith("request_changes", "Manca il caso negativo");
  });

  it("disables every transition while the session loads", () => {
    render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Riapri" })).toBeDisabled();
  });
});

describe("FeatureHeader stale base", () => {
  it("shows 'Base superata' with a Riallinea action when the draft is stale", async () => {
    const onRebase = vi.fn();
    const stale = {
      ...FEATURE,
      working_revision: { ...FEATURE.working_revision!, base_stale: true },
    } as TlFeatureDetail;
    render(<FeatureHeader feature={stale} onTransition={vi.fn()} onRebase={onRebase} />);
    expect(screen.getByText("Base superata")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Riallinea" }));
    expect(onRebase).toHaveBeenCalled();
  });

  it("has no stale badge on a fresh draft", () => {
    render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} onRebase={vi.fn()} />);
    expect(screen.queryByText("Base superata")).not.toBeInTheDocument();
  });
});
