import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationForm } from "./ApplicationForm";
import { ApiError } from "@/lib/api";
import type { Application, Product } from "@/types/release-status";

const hooks = vi.hoisted(() => ({
  save: vi.fn(),
  check: vi.fn(),
  testObjects: vi.fn(),
  ea: vi.fn(),
}));

vi.mock("@/hooks/useReleaseStatus", () => ({
  useSaveApplication: () => ({ mutateAsync: hooks.save, isPending: false }),
  useCheckApplication: () => ({ mutateAsync: hooks.check, isPending: false }),
  useTestObjects: hooks.testObjects,
  useEaComponents: hooks.ea,
}));

const products: Product[] = [{ id: "p1", name: "Wallet", area: "CORE", application_count: 1, hidden: false }];

const saved: Application = {
  id: "a1",
  product_id: "p1",
  name: "Service",
  product_key: "wallet",
  repository: "wallet-service",
  pipeline_url: null,
  runtime: "AKS",
  ci: "GHA",
  kind: "backend",
  test_object: null,
  ea_node_id: null,
  hidden: false,
  version_source: "AUTO",
  manual_versions: null,
};

const okCheck = { repo: { ok: true, version: "1.4.2", detail: null }, envs: { DEV: { ok: true, version: "1.4.2", detail: null } } };

function setup(application: Application | null = null) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <ApplicationForm open application={application} products={products} defaultProductId="p1" onClose={onClose} onSaved={onSaved} />,
  );
  return { onSaved, onClose, user: userEvent.setup() };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome applicazione"), "Service");
  await user.type(screen.getByLabelText("Chiave prodotto"), "wallet");
  await user.type(screen.getByLabelText("Repository"), "wallet-service");
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.save.mockResolvedValue(saved);
  hooks.check.mockResolvedValue(okCheck);
  hooks.testObjects.mockReturnValue({ data: ["wallet-api", "helpdesk"] });
  hooks.ea.mockReturnValue({ data: [] });
});

describe("ApplicationForm", () => {
  it("requires the mandatory fields", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    expect(screen.getByText("Il nome è obbligatorio")).toBeInTheDocument();
    expect(screen.getByText("La chiave prodotto è obbligatoria")).toBeInTheDocument();
    expect(screen.getByText("Il repository è obbligatorio")).toBeInTheDocument();
    expect(hooks.save).not.toHaveBeenCalled();
  });

  it("rejects a repository outside the allowed pattern", async () => {
    const { user } = setup();
    await fillValid(user);
    await user.clear(screen.getByLabelText("Repository"));
    await user.type(screen.getByLabelText("Repository"), "bad repo/x");
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    expect(screen.getByText(/Il repository può contenere solo/)).toBeInTheDocument();
    expect(hooks.save).not.toHaveBeenCalled();
  });

  it("rejects a pipeline url that is not https", async () => {
    const { user } = setup();
    await fillValid(user);
    await user.type(screen.getByLabelText("URL pipeline"), "http://ci.example/x");
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    expect(screen.getByText("L'URL della pipeline deve iniziare con https://")).toBeInTheDocument();
    expect(hooks.save).not.toHaveBeenCalled();
  });

  it("shows a 409 message under the field named by the backend", async () => {
    hooks.save.mockRejectedValue(new ApiError(409, { detail: "Chiave prodotto già in uso", field: "product_key" }));
    const { user, onSaved } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    const field = screen.getByLabelText("Chiave prodotto");
    await waitFor(() => expect(field).toHaveAccessibleDescription("Chiave prodotto già in uso"));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows a check result per target and keeps Save enabled on failures", async () => {
    hooks.check.mockResolvedValue({
      repo: { ok: true, version: "1.4.2", detail: null },
      envs: { DEV: { ok: false, version: null, detail: "HTTP 503" } },
    });
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Verifica" }));
    expect(await screen.findByText("✓ 1.4.2")).toBeInTheDocument();
    expect(screen.getByText("✗ HTTP 503")).toBeInTheDocument();
    expect(screen.getByText(/puoi comunque salvare/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salva applicazione" })).toBeEnabled();
  });

  it("requires product key and repository before checking", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Verifica" }));
    expect(screen.getByText("Il repository è obbligatorio")).toBeInTheDocument();
    expect(hooks.check).not.toHaveBeenCalled();
  });

  it("saves without waiting for a check that never resolves", async () => {
    hooks.check.mockReturnValue(new Promise(() => {}));
    const { user, onSaved } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, expect.any(Promise)));
    expect(hooks.save).toHaveBeenCalled();
  });

  it("hands a failed check request to onSaved as null", async () => {
    hooks.check.mockRejectedValue(new ApiError(502, null));
    const { user, onSaved } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    await expect(onSaved.mock.calls[0][1]).resolves.toBeNull();
    expect(hooks.check).toHaveBeenCalledWith({ product_key: "wallet", repository: "wallet-service" });
    expect(hooks.save).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: "p1", name: "Service", pipeline_url: null, test_object: null, ea_node_id: null }),
    );
  });

  it("lists the test objects and accepts free text", async () => {
    const { user } = setup();
    const input = screen.getByRole("combobox", { name: "Test object" });
    const options = Array.from(document.querySelectorAll("#test-object-options option")).map((o) => o.getAttribute("value"));
    expect(options).toEqual(["wallet-api", "helpdesk"]);
    await user.type(input, "brand-new");
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    await waitFor(() => expect(hooks.save).toHaveBeenCalledWith(expect.objectContaining({ test_object: "brand-new" })));
  });

  it("preselects the EA component whose id equals the repository", async () => {
    hooks.ea.mockReturnValue({
      data: [
        { id: "other", name: "Other" },
        { id: "wallet-service", name: "Wallet Service" },
      ],
    });
    const { user } = setup();
    await fillValid(user);
    await waitFor(() => expect(screen.getByLabelText("Componente EA")).toHaveValue("wallet-service"));
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    await waitFor(() => expect(hooks.save).toHaveBeenCalledWith(expect.objectContaining({ ea_node_id: "wallet-service" })));
  });

  it("shows the unknown EA component error under the picker", async () => {
    hooks.save.mockRejectedValue(new ApiError(404, { detail: "Componente EA non trovato" }));
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
    expect(await screen.findByText("Componente EA non trovato")).toBeInTheDocument();
  });
});
