import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { TlFeatureDetail, TlRevision } from "@/types/test-lifecycle";
import { FeatureMetaPanel, TITLE_REQUIRED } from "./FeatureMetaPanel";
import type { RegisterFlush } from "@/lib/test-lifecycle";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), createTask: vi.fn() }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useUpdateTlFeature: () => ({ mutate: mocks.mutate }),
  useCreateTlJiraTask: () => ({ mutateAsync: mocks.createTask, isPending: false }),
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
    scenarios: [], background_errors: [], origin: "hub", pr_number: null, pr_url: null, pr_state: null, pr_error: null, work_branch: null, base_stale: false, merged_commit_sha: null,
    ...overrides,
  };
}

function feature(rev: TlRevision, overrides: Partial<TlFeatureDetail> = {}): TlFeatureDetail {
  return {
    id: "f1", code: "FEAT_001_FdR3", number: 1, status: "draft", display_status: "draft", is_running: false, scope_id: "s1", scope_code: "FdR3", scope_name: null,
    design_owner_id: "u1", reviewer_id: "u2", impl_owner_id: null, test_type: null,
    jira_design_key: "PQ-1", jira_impl_key: null, created_by: "anna@x.it",
    created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
    working_revision: rev, published_revision: null, transitions: [], git_path: null, open_issues: 0,
    jira: [], jira_history: [], jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
    ...overrides,
  };
}

function renderPanel(props: { readOnly?: boolean; reviewerEditable?: boolean; rev?: TlRevision; feat?: Partial<TlFeatureDetail>; registerFlush?: RegisterFlush } = {}) {
  const rev = props.rev ?? revision();
  const onSaveRevision = vi.fn().mockResolvedValue(rev);
  const result = render(
    <FeatureMetaPanel
      registerFlush={props.registerFlush}
      feature={feature(rev, props.feat)}
      revision={rev}
      readOnly={props.readOnly ?? false}
      reviewerEditable={props.reviewerEditable}
      onSaveRevision={onSaveRevision}
    />,
  );
  return { onSaveRevision, ...result };
}

const optionNames = (select: HTMLElement) =>
  within(select).getAllByRole("option").map((o) => o.textContent);

describe("FeatureMetaPanel", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.createTask.mockReset();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

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

  it("lets a draft pick the test type of the file", async () => {
    renderPanel({ feat: { test_type: "integration" } });
    const select = screen.getByLabelText("Test type");
    expect(optionNames(select)).toEqual(["Nessuno", "integration", "e2e", "api"]);
    expect(select).toHaveValue("integration");
    await userEvent.selectOptions(select, "api");
    expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", test_type: "api" }, expect.anything());
    await userEvent.selectOptions(select, "");
    expect(mocks.mutate).toHaveBeenLastCalledWith({ id: "f1", test_type: null }, expect.anything());
  });

  it("shows the test type as text when the revision is not editable", () => {
    renderPanel({ rev: revision({ status: "approved" }), readOnly: true, feat: { test_type: "e2e" } });
    expect(screen.queryByRole("combobox", { name: "Test type" })).not.toBeInTheDocument();
    expect(screen.getByText("@e2e")).toBeInTheDocument();
  });

  it("says when the file has no test type yet", () => {
    renderPanel({ rev: revision({ status: "approved" }), readOnly: true });
    expect(screen.getByText("Non impostato")).toBeInTheDocument();
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

  describe("Jira URLs and the design task", () => {
    const URL_PQ = "https://pagopa.atlassian.net/browse/PQ-578?focusedCommentId=1";

    it.each([
      ["Jira progettazione", "jira_design_key", "PQ-578"],
      ["Jira implementazione", "jira_impl_key", "PQ-578"],
      ["Epic QA (sovrascrive quella dell'Ambito)", "jira_qa_epic_key", "PQ-578"],
    ])("saves the bare key when a Jira URL is pasted in %s", (label, field, key) => {
      renderPanel({ feat: { jira_design_key: null } });
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value: URL_PQ } });
      expect(input).toHaveValue(key);
      fireEvent.blur(input);
      expect(mocks.mutate).toHaveBeenCalledWith({ id: "f1", [field]: key }, expect.anything());
    });

    it("saves the bare key when a Jira URL is pasted in the product Epic/Story", async () => {
      const { onSaveRevision } = renderPanel();
      const input = screen.getByLabelText("Epic/Story prodotto");
      fireEvent.change(input, { target: { value: "https://pagopa.atlassian.net/browse/abc-9" } });
      expect(input).toHaveValue("ABC-9");
      fireEvent.blur(input);
      await waitFor(() =>
        expect(onSaveRevision).toHaveBeenCalledWith(expect.objectContaining({ product_issue_key: "ABC-9" })),
      );
    });

    it("keeps text that is not a Jira key or URL untouched", () => {
      renderPanel({ feat: { jira_design_key: null } });
      const input = screen.getByLabelText("Jira progettazione");
      fireEvent.change(input, { target: { value: "boh" } });
      expect(input).toHaveValue("boh");
    });

    it("offers to create the design task on a draft without a key", async () => {
      mocks.createTask.mockResolvedValue({});
      renderPanel({ feat: { jira_design_key: null } });
      await userEvent.click(screen.getByRole("button", { name: "Crea task" }));
      expect(mocks.createTask).toHaveBeenCalledWith({ featureId: "f1", kind: "design" });
    });

    it("shows the key of a task created meanwhile and never wipes it on blur", () => {
      const rev = revision();
      const props = { revision: rev, readOnly: false, onSaveRevision: vi.fn().mockResolvedValue(rev) };
      const { rerender } = render(<FeatureMetaPanel {...props} feature={feature(rev, { jira_design_key: null })} />);
      rerender(<FeatureMetaPanel {...props} feature={feature(rev, { jira_design_key: "PQ-20" })} />);
      const input = screen.getByLabelText("Jira progettazione");
      expect(input).toHaveValue("PQ-20");
      fireEvent.blur(input);
      expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it("hides the create button when a key is set, when read-only, or past draft", () => {
      const { unmount } = renderPanel();
      expect(screen.queryByRole("button", { name: "Crea task" })).toBeNull();
      unmount();
      const second = renderPanel({ readOnly: true, feat: { jira_design_key: null } });
      expect(screen.queryByRole("button", { name: "Crea task" })).toBeNull();
      second.unmount();
      renderPanel({ rev: revision({ status: "in_review" }), feat: { jira_design_key: null } });
      expect(screen.queryByRole("button", { name: "Crea task" })).toBeNull();
    });

    it("hints that a reopened draft needs its own design task", () => {
      renderPanel({ rev: revision({ number: 2 }), feat: { jira_design_key: null } });
      expect(screen.getByText("Questa revisione richiede un nuovo task di progettazione")).toBeInTheDocument();
    });

    it("shows no hint on a first draft or once the key is set", () => {
      const { unmount } = renderPanel({ feat: { jira_design_key: null } });
      expect(screen.queryByText("Questa revisione richiede un nuovo task di progettazione")).toBeNull();
      unmount();
      renderPanel({ rev: revision({ number: 2 }) });
      expect(screen.queryByText("Questa revisione richiede un nuovo task di progettazione")).toBeNull();
    });
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

  describe("compact layout", () => {
    it("shows people as chips with initials when read-only", () => {
      renderPanel({ rev: revision({ status: "approved" }), readOnly: true, reviewerEditable: false });
      expect(screen.getByText("Anna Rossi")).toBeInTheDocument();
      expect(screen.getByText("AR")).toBeInTheDocument();
      expect(screen.getByText("BB")).toBeInTheDocument();
      expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    });

    it("collapses to a summary with owners and Jira keys", async () => {
      renderPanel();
      expect(screen.queryByTestId("meta-summary")).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Metadati" }));

      expect(screen.getByRole("button", { name: "Metadati" })).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByLabelText("Titolo")).not.toBeVisible();
      const summary = screen.getByTestId("meta-summary");
      expect(within(summary).getByText("Pagamento")).toBeInTheDocument();
      expect(within(summary).getByText("Anna Rossi")).toBeInTheDocument();
      expect(within(summary).getByText("Bruno Bianchi")).toBeInTheDocument();
      expect(within(summary).getByText("PQ-1")).toBeInTheDocument();
    });

    it("keeps the fields mounted and the flush registered while collapsed", async () => {
      const unregister = vi.fn();
      const registerFlush = vi.fn(() => unregister);
      const { unmount } = renderPanel({ registerFlush });
      // the draft and the Jira keys each register a flush
      const registered = registerFlush.mock.calls.length;
      expect(registered).toBeGreaterThan(0);

      await userEvent.click(screen.getByRole("button", { name: "Metadati" }));
      expect(screen.getByLabelText("Titolo")).toBeInTheDocument();
      expect(registerFlush).toHaveBeenCalledTimes(registered);
      expect(unregister).not.toHaveBeenCalled();

      unmount();
      expect(unregister).toHaveBeenCalledTimes(registered);
    });

    it("shows Jira chips in the collapsed summary and plain keys for unlinked ones", async () => {
      renderPanel({
        feat: {
          jira_impl_key: "PQ-2",
          jira: [
            { role: "design", key: "PQ-1", summary: "Progettazione", status: "In corso", category: "indeterminate", url: "https://jira.test/browse/PQ-1", verified: true },
          ],
        },
      });
      await userEvent.click(screen.getByRole("button", { name: "Metadati" }));
      const summary = screen.getByTestId("meta-summary");
      expect(within(summary).getByTestId("jira-chip-PQ-1")).toHaveTextContent("In corso");
      expect(within(summary).getByText("PQ-2")).toBeInTheDocument();
      expect(within(summary).queryByTestId("jira-chip-PQ-2")).not.toBeInTheDocument();
    });

    it("puts the product and the estimates in the same row of columns", () => {
      renderPanel();
      const row = screen.getByLabelText("Epic/Story prodotto").closest("div.grid");
      expect(row).not.toBeNull();
      expect(screen.getByLabelText("Stima progettazione (giorni)").closest("div.grid")).toBe(row);
      expect(screen.getByLabelText("Stima implementazione (giorni)").closest("div.grid")).toBe(row);
    });

    it("keeps long field labels on one line", () => {
      renderPanel();
      expect(screen.getByText("Epic QA (sovrascrive quella dell'Ambito)")).toHaveClass("truncate");
    });

    it("remembers the collapsed state", async () => {
      const first = renderPanel();
      await userEvent.click(screen.getByRole("button", { name: "Metadati" }));
      first.unmount();

      renderPanel();
      expect(screen.getByRole("button", { name: "Metadati" })).toHaveAttribute("aria-expanded", "false");
    });

    it("flags a missing title even when collapsed", async () => {
      renderPanel();
      const title = screen.getByLabelText("Titolo");
      fireEvent.change(title, { target: { value: "   " } });
      await userEvent.click(screen.getByRole("button", { name: "Metadati" }));
      expect(within(screen.getByTestId("meta-summary")).getByText(TITLE_REQUIRED)).toBeInTheDocument();
    });
  });
});
