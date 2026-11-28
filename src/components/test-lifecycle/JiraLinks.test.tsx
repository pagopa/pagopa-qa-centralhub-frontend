import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail, TlJiraLink, TlRevision } from "@/types/test-lifecycle";
import { JiraLinks } from "./JiraLinks";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  refresh: vi.fn(),
  perms: new Set<string>(["edit:tl_feature"]),
  pending: false,
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useCreateTlJiraTask: () => ({ mutateAsync: mocks.create, isPending: mocks.pending }),
  useRefreshTlJira: () => ({ mutateAsync: mocks.refresh, isPending: false }),
}));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ can: (a: string) => mocks.perms.has(a) }),
}));

function link(o: Partial<TlJiraLink>): TlJiraLink {
  return {
    role: "design", key: "PQ-1", summary: "Titolo", status: "In corso",
    category: "indeterminate", url: "https://jira.test/browse/PQ-1", verified: true, ...o,
  };
}

function feature(o: Partial<TlFeatureDetail> = {}, revStatus = "draft"): TlFeatureDetail {
  return {
    id: "f1", status: "draft", jira_design_key: null, jira_impl_key: null, jira: [], jira_history: [],
    jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: "PQ-495",
    working_revision: { id: "r1", status: revStatus } as TlRevision, published_revision: null,
    ...o,
  } as TlFeatureDetail;
}

describe("JiraLinks", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.refresh.mockReset();
    mocks.perms = new Set(["edit:tl_feature"]);
    mocks.pending = false;
  });

  it("shows the history per revision and the product Epic/Story, linking only http(s) urls", () => {
    render(
      <JiraLinks
        feature={feature({
          jira: [link({ role: "product", key: "ABC-1", url: "javascript:alert(1)", summary: "Storia" })],
          jira_history: [
            {
              revision_number: 1, revision_status: "draft", is_current: true,
              design: link({ role: "design", key: "PQ-1" }),
              impl: null,
              qa_epic: link({ role: "qa_epic", key: "PQ-495", category: "done" }),
            },
          ],
        })}
      />,
    );
    const row = screen.getByTestId("jira-history-row-1");
    expect(within(row).getByRole("link", { name: "PQ-1" })).toHaveAttribute("href", "https://jira.test/browse/PQ-1");
    expect(within(row).getByText("In corso")).toBeInTheDocument();
    expect(within(row).getByText("Fatto")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ABC-1" })).toBeNull();
    expect(screen.getByText("ABC-1")).toBeInTheDocument();
  });

  it("offers the design task only on a draft without key, with permission", async () => {
    mocks.create.mockResolvedValue({ jira_warning: "Assegnatario non trovato su Jira" });
    const { rerender } = render(<JiraLinks feature={feature()} />);
    await userEvent.click(screen.getByRole("button", { name: "Crea task Progettazione" }));
    expect(mocks.create).toHaveBeenCalledWith({ featureId: "f1", kind: "design" });
    expect(await screen.findByText("Assegnatario non trovato su Jira")).toBeInTheDocument();

    rerender(<JiraLinks feature={feature({ jira_design_key: "PQ-1" })} />);
    expect(screen.queryByRole("button", { name: "Crea task Progettazione" })).toBeNull();
    rerender(<JiraLinks feature={feature({}, "in_review")} />);
    expect(screen.queryByRole("button", { name: "Crea task Progettazione" })).toBeNull();
    mocks.perms = new Set();
    rerender(<JiraLinks feature={feature()} />);
    expect(screen.queryByRole("button", { name: "Crea task Progettazione" })).toBeNull();
  });

  it("offers the implementation task as soon as the revision is approved, without waiting for an error", async () => {
    mocks.create.mockResolvedValue({ jira_warning: null });
    const approved = { status: "designed" as const, working_revision: null,
      published_revision: { id: "r1", status: "approved" } as TlRevision };
    render(<JiraLinks feature={feature(approved)} />);
    await userEvent.click(screen.getByRole("button", { name: "Crea task Implementazione" }));
    expect(mocks.create).toHaveBeenCalledWith({ featureId: "f1", kind: "impl" });
  });

  it("offers the implementation task on a reopened feature whose new revision is approved", async () => {
    render(
      <JiraLinks
        feature={feature({
          status: "implemented",
          working_revision: { id: "r2", status: "approved" } as TlRevision,
          published_revision: { id: "r1", status: "merged" } as TlRevision,
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Crea task Implementazione" })).toBeInTheDocument();
  });

  it("does not offer the implementation task while the revision is still being designed", () => {
    const base = { status: "implemented" as const, published_revision: { id: "r1", status: "merged" } as TlRevision };
    const { rerender } = render(
      <JiraLinks feature={feature({ ...base, working_revision: { id: "r2", status: "draft" } as TlRevision })} />,
    );
    expect(screen.queryByRole("button", { name: /task Implementazione/ })).toBeNull();
    rerender(
      <JiraLinks feature={feature({ ...base, working_revision: { id: "r2", status: "in_review" } as TlRevision })} />,
    );
    expect(screen.queryByRole("button", { name: /task Implementazione/ })).toBeNull();
    rerender(<JiraLinks feature={feature({ status: "draft" })} />);
    expect(screen.queryByRole("button", { name: /task Implementazione/ })).toBeNull();
  });

  it("does not offer the implementation task when it exists or without permission", () => {
    const approved = { status: "designed" as const, working_revision: null,
      published_revision: { id: "r1", status: "approved" } as TlRevision };
    const { rerender } = render(<JiraLinks feature={feature({ ...approved, jira_impl_key: "PQ-9" })} />);
    expect(screen.queryByRole("button", { name: /task Implementazione/ })).toBeNull();
    mocks.perms = new Set();
    rerender(<JiraLinks feature={feature(approved)} />);
    expect(screen.queryByRole("button", { name: /task Implementazione/ })).toBeNull();
  });

  it("calls the implementation task a retry after a failed creation", async () => {
    mocks.create.mockResolvedValue({ jira_warning: null });
    const approved = { status: "designed" as const, working_revision: null,
      published_revision: { id: "r1", status: "approved" } as TlRevision };
    render(<JiraLinks feature={feature({ ...approved, jira_error: "Jira giù" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Jira giù");
    expect(screen.queryByRole("button", { name: "Crea task Implementazione" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Riprova task Implementazione" }));
    expect(mocks.create).toHaveBeenCalledWith({ featureId: "f1", kind: "impl" });
  });

  it("refreshes from Jira and shows the error message on failure", async () => {
    mocks.refresh.mockRejectedValue(new Error("x"));
    render(<JiraLinks feature={feature({ jira: [link({})] })} />);
    await userEvent.click(screen.getByRole("button", { name: "Aggiorna da Jira" }));
    expect(mocks.refresh).toHaveBeenCalledWith({ featureId: "f1" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Aggiornamento da Jira non riuscito.");
  });

  it("does not ask for an Epic when the feature or its scope already has one", () => {
    render(<JiraLinks feature={feature()} />);
    expect(screen.queryByLabelText("Epic QA (obbligatoria)")).toBeNull();
  });

  it("requires the Epic QA before creating a task when there is none, and sends it", async () => {
    mocks.create.mockResolvedValue({ jira_warning: null });
    render(<JiraLinks feature={feature({ jira_qa_epic_effective: null })} />);
    const create = screen.getByRole("button", { name: "Crea task Progettazione" });
    expect(screen.getByText(/collegato a un.Epic QA/i)).toBeInTheDocument();
    expect(create).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Epic QA (obbligatoria)"), " pq-495 ");
    expect(create).toBeEnabled();
    await userEvent.click(create);
    expect(mocks.create).toHaveBeenCalledWith({ featureId: "f1", kind: "design", epicKey: "PQ-495" });
  });

  it("also asks for the Epic when retrying the implementation task", async () => {
    mocks.create.mockResolvedValue({ jira_warning: null });
    const approved = { status: "designed" as const, working_revision: null, jira_qa_epic_effective: null,
      jira_error: "Serve l'Epic QA", published_revision: { id: "r1", status: "approved" } as TlRevision };
    render(<JiraLinks feature={feature(approved)} />);
    expect(screen.getByRole("button", { name: "Riprova task Implementazione" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Epic QA (obbligatoria)"), "PQ-495");
    await userEvent.click(screen.getByRole("button", { name: "Riprova task Implementazione" }));
    expect(mocks.create).toHaveBeenCalledWith({ featureId: "f1", kind: "impl", epicKey: "PQ-495" });
  });

  it("shows a spinner and a progress label while the task is being created", () => {
    mocks.pending = true;
    render(<JiraLinks feature={feature()} />);
    const button = screen.getByRole("button", { name: "Creazione task Progettazione…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();
  });
});
