import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TlFeatureDetail, TlJiraLink, TlRevision } from "@/types/test-lifecycle";
import { JiraLinks } from "./JiraLinks";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  refresh: vi.fn(),
  perms: new Set<string>(["edit:tl_feature"]),
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useCreateTlJiraTask: () => ({ mutateAsync: mocks.create, isPending: false }),
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
    id: "f1", status: "draft", jira_design_key: null, jira_impl_key: null, jira: [],
    jira_error: null, jira_qa_epic_key: null, jira_qa_epic_effective: null,
    working_revision: { id: "r1", status: revStatus } as TlRevision, published_revision: null,
    ...o,
  } as TlFeatureDetail;
}

describe("JiraLinks", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.refresh.mockReset();
    mocks.perms = new Set(["edit:tl_feature"]);
  });

  it("shows each role with status badge and links only http(s) urls", () => {
    render(
      <JiraLinks
        feature={feature({
          jira: [
            link({ role: "design", key: "PQ-1" }),
            link({ role: "qa_epic", key: "PQ-495", category: "done", url: "javascript:alert(1)" }),
            link({ role: "product", key: "ABC-1", verified: false, summary: null, category: null }),
          ],
        })}
      />,
    );
    expect(screen.getByRole("link", { name: "PQ-1" })).toHaveAttribute("href", "https://jira.test/browse/PQ-1");
    expect(screen.queryByRole("link", { name: "PQ-495" })).toBeNull();
    expect(screen.getByText("PQ-495")).toBeInTheDocument();
    const design = screen.getByTestId("jira-design");
    expect(within(design).getByText("In corso")).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-qa_epic")).getByText("Fatto")).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-product")).getByText("Non verificata")).toBeInTheDocument();
    expect(within(screen.getByTestId("jira-impl")).getByText("Nessun task")).toBeInTheDocument();
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

  it("offers the implementation retry only after a failed creation", async () => {
    mocks.create.mockResolvedValue({ jira_warning: null });
    const approved = { status: "designed" as const, working_revision: null,
      published_revision: { id: "r1", status: "approved" } as TlRevision };
    const { rerender } = render(<JiraLinks feature={feature(approved)} />);
    expect(screen.queryByRole("button", { name: "Riprova task Implementazione" })).toBeNull();
    rerender(<JiraLinks feature={feature({ ...approved, jira_error: "Jira giù" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Jira giù");
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
});
