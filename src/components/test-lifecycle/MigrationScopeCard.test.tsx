import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { MigrationScopeCard } from "./MigrationScopeCard";
import { migrationScope } from "./migrationTestData";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), retryPr: vi.fn(), retryConf: vi.fn() }));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useExecuteTlMigrationScope: () => ({ mutateAsync: mocks.execute, isPending: false }),
  useRetryTlMigrationPr: () => ({ mutateAsync: mocks.retryPr, isPending: false }),
  useRetryTlMigrationConfluence: () => ({ mutateAsync: mocks.retryConf, isPending: false }),
}));

describe("MigrationScopeCard", () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    mocks.retryPr.mockReset();
    mocks.retryConf.mockReset();
  });

  it("executes the scope and shows the blocking reasons", async () => {
    mocks.execute.mockRejectedValue(
      new ApiError(409, { detail: { code: "migration_blocked", message: "Esecuzione bloccata", reasons: ["Numero 005 usato da più righe"] } }),
    );
    render(<MigrationScopeCard scope={migrationScope()} cleanPending={1} onConfirmClean={vi.fn()} />);
    expect(screen.getByText(/2 confermate/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Esegui FdR3" }));
    expect(mocks.execute).toHaveBeenCalledWith({ scopeCode: "FdR3" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Numero 005 usato da più righe");
  });

  it("disables execution without confirmed rows and confirms clean rows", async () => {
    const onConfirmClean = vi.fn();
    render(<MigrationScopeCard scope={migrationScope({ confirmed: 0 })} cleanPending={3} onConfirmClean={onConfirmClean} />);
    expect(screen.getByRole("button", { name: "Esegui FdR3" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Conferma 3 righe senza problemi" }));
    expect(onConfirmClean).toHaveBeenCalled();
  });

  it("shows PR link only for http(s) and retry buttons on errors", async () => {
    const { rerender } = render(
      <MigrationScopeCard
        scope={migrationScope({ pr_number: 7, pr_url: "javascript:x", pr_state: "open" })}
        cleanPending={0}
        onConfirmClean={vi.fn()}
      />,
    );
    expect(screen.queryByRole("link", { name: /PR #7/ })).toBeNull();
    expect(screen.getByText(/PR #7/)).toBeInTheDocument();
    rerender(
      <MigrationScopeCard
        scope={migrationScope({
          pr_number: 7, pr_url: "https://github.test/pull/7", pr_state: "open", pr_error: "GitHub giù",
          confluence_errors: [{ page_id: "p1", message: "409" }],
        })}
        cleanPending={0}
        onConfirmClean={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /PR #7/ })).toHaveAttribute("href", "https://github.test/pull/7");
    await userEvent.click(screen.getByRole("button", { name: "Riprova PR" }));
    expect(mocks.retryPr).toHaveBeenCalledWith({ scopeCode: "FdR3" });
    await userEvent.click(screen.getByRole("button", { name: "Riprova Confluence" }));
    expect(mocks.retryConf).toHaveBeenCalledWith({ scopeCode: "FdR3" });
  });
});
