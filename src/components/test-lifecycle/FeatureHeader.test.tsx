import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail, TlRevisionStatus } from "@/types/test-lifecycle";
import { FeatureHeader } from "./FeatureHeader";

const gate = vi.hoisted(() => ({ denied: new Set<string>() }));

vi.mock("@/lib/permissions", () => ({
  Gate: ({ action, children }: { action: string; children: ReactNode }) =>
    gate.denied.has(action) ? null : <>{children}</>,
}));

afterEach(() => gate.denied.clear());

const FEATURE = {
  id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", scope_id: "s1", scope_code: "FdR3",
  design_owner_id: null, reviewer_id: null, impl_owner_id: null, test_type: null, jira_design_key: null,
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
  jira: [], jira_history: [], jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
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

  it("shows Elimina only when onDelete is provided and calls it", async () => {
    const { rerender } = render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Elimina" })).not.toBeInTheDocument();
    const onDelete = vi.fn();
    rerender(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("disables Elimina with a tooltip when the feature is not deletable", () => {
    render(<FeatureHeader feature={FEATURE} onTransition={vi.fn()} onDelete={vi.fn()} deletable={false} />);
    const button = screen.getByRole("button", { name: "Elimina" });
    expect(button).toBeDisabled();
    expect(button.closest("span")).toHaveAttribute("title", expect.stringContaining("non eliminabile"));
  });

  it("renders the save indicator when saveState is given", () => {
    render(
      <FeatureHeader
        feature={FEATURE}
        onTransition={vi.fn()}
        saveState={{ phase: "saving", savedAt: null, error: null }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Salvataggio…");
  });

  it("shows the ready state when the primary transition is allowed", () => {
    const ready = {
      ...FEATURE,
      transitions: FEATURE.transitions.map((t) => (t.action === "submit" ? { ...t, allowed: true, reasons: [] } : t)),
    } as TlFeatureDetail;
    render(<FeatureHeader feature={ready} onTransition={vi.fn()} />);
    expect(screen.getByText("Pronta per l'invio in review")).toBeInTheDocument();
  });
});

describe("FeatureHeader going back", () => {
  const MERGED_REASON = "La PR è già stata mergiata: usa Riapri";

  function featureAt(
    status: TlRevisionStatus,
    allowed: { withdrawApproval?: boolean; withdraw?: boolean } = {},
    revisionOverrides: Record<string, unknown> = {},
  ): TlFeatureDetail {
    return {
      ...FEATURE,
      working_revision: { ...FEATURE.working_revision!, status, ...revisionOverrides },
      transitions: [
        ...FEATURE.transitions,
        {
          action: "withdraw_approval",
          allowed: allowed.withdrawApproval ?? false,
          reasons: allowed.withdrawApproval ? [] : [MERGED_REASON],
        },
        {
          action: "withdraw",
          allowed: allowed.withdraw ?? false,
          reasons: allowed.withdraw ? [] : ["La revisione non è in revisione"],
        },
      ],
    } as TlFeatureDetail;
  }

  it("shows 'Riporta in review' only while the revision is approved", () => {
    const { rerender } = render(
      <FeatureHeader feature={featureAt("approved", { withdrawApproval: true })} onTransition={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Riporta in review" })).toBeEnabled();
    for (const status of ["draft", "in_review"] as const) {
      rerender(<FeatureHeader feature={featureAt(status, { withdrawApproval: true })} onTransition={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Riporta in review" })).not.toBeInTheDocument();
    }
  });

  it("shows 'Ritira in bozza' only while the revision is in review", () => {
    const { rerender } = render(
      <FeatureHeader feature={featureAt("in_review", { withdraw: true })} onTransition={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Ritira in bozza" })).toBeEnabled();
    for (const status of ["draft", "approved"] as const) {
      rerender(<FeatureHeader feature={featureAt(status, { withdraw: true })} onTransition={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Ritira in bozza" })).not.toBeInTheDocument();
    }
  });

  it("exposes the reasons of a blocked 'Riporta in review'", () => {
    render(<FeatureHeader feature={featureAt("approved")} onTransition={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Riporta in review" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/La PR è già stata mergiata/);
  });

  it("asks for confirmation before withdrawing an approval and explains the open PR", async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    render(
      <FeatureHeader
        feature={featureAt("approved", { withdrawApproval: true }, { pr_number: 7, pr_state: "open" })}
        onTransition={onTransition}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Riporta in review" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("resta aperta");
    expect(dialog).toHaveTextContent("#7");
    expect(onTransition).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Conferma" }));
    expect(onTransition).toHaveBeenCalledWith("withdraw_approval");
  });

  it("does nothing when the confirmation is cancelled", async () => {
    const onTransition = vi.fn();
    render(
      <FeatureHeader feature={featureAt("approved", { withdrawApproval: true })} onTransition={onTransition} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Riporta in review" }));
    await userEvent.click(await screen.findByRole("button", { name: "Annulla" }));
    expect(onTransition).not.toHaveBeenCalled();
  });

  it("announces the PR explanation as the dialog description", async () => {
    render(
      <FeatureHeader
        feature={featureAt("approved", { withdrawApproval: true }, { pr_number: 7, pr_state: "open" })}
        onTransition={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Riporta in review" }));
    expect(await screen.findByRole("dialog")).toHaveAccessibleDescription(/resta aperta/);
  });

  it("shows an error in the dialog only after a failed confirmation, not a stale one", async () => {
    const onTransition = vi.fn().mockResolvedValue(false);
    render(
      <FeatureHeader
        feature={featureAt("approved", { withdrawApproval: true })}
        onTransition={onTransition}
        error="Errore precedente"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Riporta in review" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Conferma" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Errore precedente");
  });

  it("gates the two actions with their own permissions", () => {
    gate.denied.add("review:tl_feature");
    const { rerender } = render(
      <FeatureHeader feature={featureAt("approved", { withdrawApproval: true })} onTransition={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Riporta in review" })).not.toBeInTheDocument();

    gate.denied.clear();
    gate.denied.add("edit:tl_feature");
    rerender(<FeatureHeader feature={featureAt("in_review", { withdraw: true })} onTransition={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Ritira in bozza" })).not.toBeInTheDocument();

    gate.denied.clear();
    gate.denied.add("review:tl_feature");
    rerender(<FeatureHeader feature={featureAt("in_review", { withdraw: true })} onTransition={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Ritira in bozza" })).toBeInTheDocument();
  });

  it("withdraws a submission without a note or a dialog", async () => {
    const onTransition = vi.fn().mockResolvedValue(undefined);
    render(<FeatureHeader feature={featureAt("in_review", { withdraw: true })} onTransition={onTransition} />);
    await userEvent.click(screen.getByRole("button", { name: "Ritira in bozza" }));
    expect(onTransition).toHaveBeenCalledWith("withdraw");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("FeatureHeader open-PR warning", () => {
  function withPr(status: TlRevisionStatus, pr_state: "open" | "merged" | "closed" | null, pr_number = 7) {
    return {
      ...FEATURE,
      working_revision: { ...FEATURE.working_revision!, status, pr_state, pr_number },
    } as TlFeatureDetail;
  }

  it("warns when a withdrawn revision still has an open PR", () => {
    for (const status of ["in_review", "draft"] as const) {
      const { unmount } = render(<FeatureHeader feature={withPr(status, "open")} onTransition={vi.fn()} />);
      const notice = screen.getByRole("note");
      expect(notice).toHaveTextContent("La PR #7 è ancora aperta con la versione approvata in precedenza");
      expect(notice).toHaveTextContent("non mergiarla finché la revisione non è di nuovo approvata");
      unmount();
    }
  });

  it("does not warn for an ordinary draft without a PR", () => {
    render(<FeatureHeader feature={withPr("draft", null)} onTransition={vi.fn()} />);
    expect(screen.queryByText(/ancora aperta con la versione approvata/)).not.toBeInTheDocument();
  });

  it("does not warn when the PR is merged or closed, or the revision is approved", () => {
    for (const [status, state] of [["draft", "merged"], ["draft", "closed"], ["approved", "open"]] as const) {
      const { unmount } = render(<FeatureHeader feature={withPr(status, state)} onTransition={vi.fn()} />);
      expect(screen.queryByText(/ancora aperta con la versione approvata/)).not.toBeInTheDocument();
      unmount();
    }
  });
});
