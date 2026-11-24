import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlFeatureDetail, TlRevision } from "@/types/test-lifecycle";
import { FeatureMetaPanel, TITLE_REQUIRED } from "./FeatureMetaPanel";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useUpdateTlFeature: () => ({ mutate: mocks.mutate }),
}));
vi.mock("@/hooks/useUsers", () => ({
  useUsers: () => ({
    data: {
      items: [
        { id: "u1", email: "anna@x.it", name: "Anna Rossi", is_active: true },
        { id: "u2", email: "bruno@x.it", name: "Bruno Bianchi", is_active: true },
        { id: "u3", email: "carla@x.it", name: "Carla Ex", is_active: false },
      ],
    },
  }),
}));

function revision(overrides: Partial<TlRevision> = {}): TlRevision {
  return {
    id: "r1", number: 1, status: "draft", lock_version: 0, title: "Pagamento",
    description: null, background_steps: null, requirements_url: null, product_issue_key: null,
    reverse_engineering: false, design_estimate_days: null, impl_estimate_days: null,
    created_by: "anna@x.it", approved_by: null, approved_at: null,
    created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
    scenarios: [], background_errors: [], origin: "hub", pr_number: null, pr_url: null, pr_state: null, pr_error: null, base_stale: false, merged_commit_sha: null,
    ...overrides,
  };
}

function feature(rev: TlRevision, overrides: Partial<TlFeatureDetail> = {}): TlFeatureDetail {
  return {
    id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", scope_id: "s1", scope_code: "FdR3",
    design_owner_id: "u1", reviewer_id: "u2", impl_owner_id: null,
    jira_design_key: "PQ-1", jira_impl_key: null, created_by: "anna@x.it",
    created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
    working_revision: rev, published_revision: null, transitions: [], git_path: null, open_issues: 0,
    jira: [], jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
    ...overrides,
  };
}

function renderPanel(props: { readOnly?: boolean; reviewerEditable?: boolean; rev?: TlRevision; feat?: Partial<TlFeatureDetail> } = {}) {
  const rev = props.rev ?? revision();
  const onSaveRevision = vi.fn().mockResolvedValue(rev);
  render(
    <FeatureMetaPanel
      feature={feature(rev, props.feat)}
      revision={rev}
      readOnly={props.readOnly ?? false}
      reviewerEditable={props.reviewerEditable}
      onSaveRevision={onSaveRevision}
    />,
  );
  return { onSaveRevision };
}

const optionNames = (select: HTMLElement) =>
  within(select).getAllByRole("option").map((o) => o.textContent);

describe("FeatureMetaPanel", () => {
  beforeEach(() => mocks.mutate.mockReset());

  it("lists only active users in the pickers and never the owner as reviewer", () => {
    renderPanel();
    expect(optionNames(screen.getByLabelText("Owner design"))).toEqual(["Nessuno", "Anna Rossi", "Bruno Bianchi"]);
    expect(optionNames(screen.getByLabelText("Owner implementazione"))).toEqual([
      "Nessuno", "Anna Rossi", "Bruno Bianchi",
    ]);
    expect(optionNames(screen.getByLabelText("Reviewer"))).toEqual(["Nessuno", "Bruno Bianchi"]);
  });

  it("keeps showing a current inactive assignee as a disabled option", () => {
    renderPanel({ feat: { impl_owner_id: "u3" } });
    const option = within(screen.getByLabelText("Owner implementazione")).getByRole("option", {
      name: "Carla Ex (non attivo)",
    });
    expect(option).toBeDisabled();
    expect(screen.getByLabelText("Owner implementazione")).toHaveValue("u3");
  });

  it("links the saved requirements only when they are an http(s) URL", () => {
    renderPanel({ rev: revision({ status: "approved", requirements_url: "https://wiki.example.test/srs" }), readOnly: true });
    expect(screen.getByRole("link", { name: "https://wiki.example.test/srs" })).toHaveAttribute(
      "href",
      "https://wiki.example.test/srs",
    );
  });

  it("shows non-http requirements as plain text", () => {
    renderPanel({ rev: revision({ status: "approved", requirements_url: "javascript:alert(1)" }), readOnly: true });
    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /javascript/ })).not.toBeInTheDocument();
  });

  it("keeps only the reviewer editable while the revision is in review", async () => {
    renderPanel({ rev: revision({ status: "in_review" }), readOnly: true, reviewerEditable: true });
    expect(screen.queryByRole("combobox", { name: "Owner design" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Owner implementazione" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Jira progettazione")).toHaveAttribute("readonly");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reviewer" }), "");
    expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", reviewer_id: null }, expect.anything());
  });

  it("is fully read-only when the reviewer is not editable either", () => {
    renderPanel({ rev: revision({ status: "approved" }), readOnly: true, reviewerEditable: false });
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("shows the backend message when the reviewer change is rejected", async () => {
    mocks.mutate.mockImplementation((_payload: unknown, opts?: { onError?: (e: unknown) => void }) => {
      opts?.onError?.(
        new ApiError(422, {
          detail: { code: "unknown_user", message: "Utente indicato non esistente o non attivo" },
        }),
      );
    });
    renderPanel({ rev: revision({ status: "in_review" }), readOnly: true, reviewerEditable: true });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reviewer" }), "");
    expect(await screen.findByRole("alert")).toHaveTextContent("Utente indicato non esistente o non attivo");
  });

  it("flags an empty title inline and does not save it", () => {
    const { onSaveRevision } = renderPanel();
    const title = screen.getByLabelText("Titolo");
    fireEvent.change(title, { target: { value: "   " } });
    fireEvent.blur(title);
    expect(screen.getByText(TITLE_REQUIRED)).toBeInTheDocument();
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription(TITLE_REQUIRED);
    expect(onSaveRevision).not.toHaveBeenCalled();
    fireEvent.change(title, { target: { value: "Nuovo titolo" } });
    expect(screen.queryByText(TITLE_REQUIRED)).not.toBeInTheDocument();
    expect(title).not.toHaveAttribute("aria-invalid");
  });

  it("saves the feature QA epic override, showing the effective one as placeholder", () => {
    renderPanel({ feat: { jira_qa_epic_effective: "PQ-495" } });
    const epic = screen.getByLabelText("Epic QA (sovrascrive quella dell'Ambito)");
    expect(epic).toHaveAttribute("placeholder", "PQ-495");
    fireEvent.change(epic, { target: { value: "PQ-777" } });
    fireEvent.blur(epic);
    expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", jira_qa_epic_key: "PQ-777" }, expect.anything());
  });

  it("shows the not-an-epic error from the backend", () => {
    mocks.mutate.mockImplementation((_p: unknown, opts?: { onError?: (e: unknown) => void }) => {
      opts?.onError?.(new ApiError(422, { detail: { code: "jira_not_an_epic", message: "PQ-12 non è un'Epic" } }));
    });
    renderPanel();
    const epic = screen.getByLabelText("Epic QA (sovrascrive quella dell'Ambito)");
    fireEvent.change(epic, { target: { value: "PQ-12" } });
    fireEvent.blur(epic);
    expect(screen.getByRole("alert")).toHaveTextContent("PQ-12 non è un'Epic");
  });

  describe("sections", () => {
    it("renders the four section titles", () => {
      renderPanel();
      for (const title of ["Generale", "Persone", "Jira", "Prodotto e stime"]) {
        expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      }
    });

    it("shows the Jira status chip and link under a linked key", () => {
      renderPanel({
        feat: {
          jira: [
            { role: "design", key: "PQ-1", summary: "Progettazione", status: "In corso", category: "indeterminate", url: "https://jira.test/browse/PQ-1", verified: true },
          ],
        },
      });
      const chip = screen.getByTestId("jira-chip-PQ-1");
      expect(chip).toHaveTextContent("In corso");
      expect(within(chip).getByRole("link", { name: /PQ-1/ })).toHaveAttribute("href", "https://jira.test/browse/PQ-1");
    });

    it("shows no chip for an unlinked key", () => {
      renderPanel({ feat: { jira: [] } });
      expect(screen.queryByTestId("jira-chip-PQ-1")).not.toBeInTheDocument();
    });

    it("Epic QA field explains the override via title", () => {
      renderPanel();
      expect(screen.getByLabelText(/Epic QA/).closest("label")).toHaveAttribute(
        "title",
        expect.stringContaining("sovrascrive"),
      );
    });
  });

  describe("pending Jira keys", () => {
    it("registers a dirty checker and flusher so Ctrl+S and the leave warning cover typed Jira keys", async () => {
      let flush: (() => Promise<boolean>) | undefined;
      let dirty: (() => boolean) | undefined;
      const registerFlush = vi.fn((fn: () => Promise<boolean>, isDirty?: () => boolean) => {
        // The revision draft registers too: keep the Jira one (the last registered).
        flush = fn;
        dirty = isDirty;
        return () => {};
      });
      mocks.mutate.mockImplementation((_patch: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.());
      const rev = revision();
      render(
        <FeatureMetaPanel
          feature={feature(rev, { jira_design_key: "PQ-1" })}
          revision={rev}
          readOnly={false}
          onSaveRevision={vi.fn().mockResolvedValue(rev)}
          registerFlush={registerFlush}
        />,
      );
      await userEvent.clear(screen.getByLabelText("Jira progettazione"));
      await userEvent.type(screen.getByLabelText("Jira progettazione"), "PQ-2");
      expect(dirty?.()).toBe(true);
      await expect(flush?.()).resolves.toBe(true);
      expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", jira_design_key: "PQ-2" }, expect.anything());
    });
  });
});
