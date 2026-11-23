import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ImportFromGitDialog } from "./ImportFromGitDialog";

// Funzione semplice (non vi.fn): una spia su una promessa rifiutata lascia un rifiuto non gestito.
const mocks = vi.hoisted(() => ({
  calls: [] as unknown[],
  impl: (() => Promise.resolve({})) as (args: unknown) => Promise<unknown>,
}));
vi.mock("@/hooks/useTestLifecycle", () => ({
  useImportTlGit: () => ({
    mutateAsync: (args: unknown) => {
      mocks.calls.push(args);
      return mocks.impl(args);
    },
    isPending: false,
  }),
}));

const URL = "https://github.com/pagopa/repo/blob/PQ-827/src/a.feature";

function setup(scenarioCount = 0) {
  const onImported = vi.fn();
  const calls: string[] = [];
  const runAfterPending = <T,>(fn: () => Promise<T>): Promise<T> => {
    calls.push("after-pending");
    return fn();
  };
  render(
    <ImportFromGitDialog
      featureId="f1"
      revisionId="r1"
      scenarioCount={scenarioCount}
      currentLock={() => 4}
      afterPendingWrites={runAfterPending}
      onImported={onImported}
    />,
  );
  return { onImported, calls };
}

describe("ImportFromGitDialog", () => {
  beforeEach(() => {
    mocks.calls = [];
    mocks.impl = () => Promise.resolve({});
  });

  it("imports with the current lock and shows the result", async () => {
    mocks.impl = async () => ({
      replaced: 0,
      ignored_tags: ["wip"],
      feature: { import_source: { branch: "PQ-827", path: "src/a.feature" }, working_revision: { scenarios: [{}, {}] } },
    });
    const { onImported, calls } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Importa da Git" }));
    await userEvent.type(screen.getByLabelText("Link al feature file su GitHub"), URL);
    await userEvent.click(screen.getByRole("button", { name: "Importa" }));
    expect(calls).toEqual(["after-pending"]);
    expect(mocks.calls).toEqual([{ featureId: "f1", revisionId: "r1", url: URL, lockVersion: 4 }]);
    expect(await screen.findByText(/2 scenari importati/)).toBeInTheDocument();
    expect(screen.getByText(/@wip/)).toBeInTheDocument();
    expect(screen.getByText(/PR di pulizia/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onImported).toHaveBeenCalled();
  });

  it("asks to confirm the replacement of existing scenarios", async () => {
    setup(3);
    await userEvent.click(screen.getByRole("button", { name: "Importa da Git" }));
    await userEvent.type(screen.getByLabelText("Link al feature file su GitHub"), URL);
    expect(screen.getByText(/sostituisce i 3 scenari/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importa" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Ho capito/ }));
    expect(screen.getByRole("button", { name: "Importa" })).toBeEnabled();
  });

  it("shows the parse errors from the backend", async () => {
    const failure = new ApiError(422, {
      detail: { code: "import_parse_error", message: "Il feature file non è leggibile", reasons: ["Riga 3: step non valido"] },
    });
    mocks.impl = async () => {
      throw failure;
    };
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Importa da Git" }));
    await userEvent.type(screen.getByLabelText("Link al feature file su GitHub"), URL);
    await userEvent.click(screen.getByRole("button", { name: "Importa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Riga 3: step non valido");
  });
});
