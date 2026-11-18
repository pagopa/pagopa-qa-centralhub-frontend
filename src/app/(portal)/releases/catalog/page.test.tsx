import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CatalogPage from "./page";
import { ApiError } from "@/lib/api";
import type { Application, Product } from "@/types/release-status";

const hooks = vi.hoisted(() => ({
  products: vi.fn(),
  applications: vi.fn(),
  trigger: vi.fn(),
  deleteProduct: vi.fn(),
  deleteApplication: vi.fn(),
  save: vi.fn(),
  check: vi.fn(),
  saveProduct: vi.fn(),
}));
const permissions = vi.hoisted(() => ({ allowed: new Set<string>() }));

vi.mock("@/hooks/useReleaseStatus", () => ({
  useProducts: hooks.products,
  useApplications: hooks.applications,
  useTriggerReleaseSync: () => ({ mutate: hooks.trigger }),
  useDeleteProduct: () => ({ mutateAsync: hooks.deleteProduct, isPending: false }),
  useDeleteApplication: () => ({ mutateAsync: hooks.deleteApplication, isPending: false }),
  useSaveProduct: () => ({ mutateAsync: hooks.saveProduct, isPending: false }),
  useSaveApplication: () => ({ mutateAsync: hooks.save, isPending: false }),
  useCheckApplication: () => ({ mutateAsync: hooks.check, isPending: false }),
  useTestObjects: () => ({ data: [] }),
  useEaComponents: () => ({ data: [] }),
}));

vi.mock("@/lib/permissions", () => ({
  Gate: ({ action, children }: { action: string; children: ReactNode }) =>
    permissions.allowed.has(action) ? <>{children}</> : null,
}));

vi.mock("@/components/auth/RouteGuard", () => ({
  RouteGuard: ({ action, children }: { action: string; children: ReactNode }) => (
    <div data-testid="route-guard" data-action={action}>{children}</div>
  ),
}));

const products: Product[] = [
  { id: "p1", name: "Wallet", area: "CORE", application_count: 2, hidden: false },
  { id: "p2", name: "Empty", area: "CORE", application_count: 0, hidden: false },
  { id: "p3", name: "Touch", area: "TOUCHPOINT", application_count: 1, hidden: false },
];

const app: Application = {
  id: "a1",
  product_id: "p1",
  name: "Wallet Service",
  product_key: "wallet",
  repository: "wallet-service",
  pipeline_url: null,
  runtime: "AKS",
  ci: "GHA",
  kind: "backend",
  test_object: "wallet-api",
  ea_node_id: null,
  hidden: false,
  version_source: "AUTO",
  manual_versions: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  permissions.allowed = new Set(["manage:status_page", "sync:trigger"]);
  hooks.products.mockReturnValue({ data: products, isLoading: false, error: null });
  hooks.applications.mockReturnValue({ data: [app] });
  hooks.deleteProduct.mockResolvedValue(undefined);
  hooks.deleteApplication.mockResolvedValue(undefined);
  hooks.save.mockResolvedValue(app);
  hooks.saveProduct.mockResolvedValue(products[0]);
  hooks.check.mockResolvedValue({ repo: { ok: true, version: "1", detail: null }, envs: { UAT: { ok: true, version: "1", detail: null } } });
});

async function saveNewApplication(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Nuova applicazione" }));
  await user.type(screen.getByLabelText("Nome applicazione"), "X");
  await user.type(screen.getByLabelText("Chiave prodotto"), "x");
  await user.type(screen.getByLabelText("Repository"), "x-repo");
  await user.click(screen.getByRole("button", { name: "Salva applicazione" }));
}

describe("Catalog page", () => {
  it("is guarded by manage:status_page", () => {
    render(<CatalogPage />);
    expect(screen.getByTestId("route-guard")).toHaveAttribute("data-action", "manage:status_page");
  });

  it("groups products by area with application counts", () => {
    render(<CatalogPage />);
    const core = screen.getByRole("region", { name: "Area Core" });
    expect(within(core).getByText("Wallet")).toBeInTheDocument();
    expect(within(core).getByLabelText("2 applicazioni")).toBeInTheDocument();
    expect(within(core).getByText("Empty")).toBeInTheDocument();
    const touch = screen.getByRole("region", { name: "Area TouchPoint" });
    expect(within(touch).getByLabelText("1 applicazioni")).toBeInTheDocument();
  });

  it("disables deleting a product that still has applications and explains why", () => {
    render(<CatalogPage />);
    const blocked = screen.getByRole("button", { name: "Elimina prodotto Wallet" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription("Il prodotto contiene ancora applicazioni");
    fireEvent.click(blocked);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(hooks.deleteProduct).not.toHaveBeenCalled();
  });

  it("deletes an empty product after confirmation", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);
    await user.click(screen.getByRole("button", { name: "Elimina prodotto Empty" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Elimina" }));
    await waitFor(() => expect(hooks.deleteProduct).toHaveBeenCalledWith("p2"));
  });

  it("surfaces the backend 409 on product delete as the not-empty message", async () => {
    hooks.deleteProduct.mockRejectedValue(new ApiError(409, { detail: "conflict" }));
    const user = userEvent.setup();
    render(<CatalogPage />);
    await user.click(screen.getByRole("button", { name: "Elimina prodotto Empty" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Elimina" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Il prodotto contiene ancora applicazioni");
  });

  it("asks for confirmation before deleting an application, warning about history", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);
    await user.click(screen.getByRole("button", { name: "Elimina Wallet Service" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Verranno eliminati anche lo storico dei deploy e lo stato attuale")).toBeInTheDocument();
    expect(hooks.deleteApplication).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Elimina" }));
    await waitFor(() => expect(hooks.deleteApplication).toHaveBeenCalledWith("a1"));
  });

  it("shows the saved notice with a sync action for users with sync:trigger", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    expect(await screen.findByText("Applicazione salvata")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sincronizza ora" }));
    expect(hooks.trigger).toHaveBeenCalled();
    expect(screen.queryByText("Applicazione salvata")).not.toBeInTheDocument();
  });

  it("omits the sync action without sync:trigger", async () => {
    permissions.allowed.delete("sync:trigger");
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    expect(await screen.findByText("Applicazione salvata")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sincronizza ora" })).not.toBeInTheDocument();
  });

  it("reports a failed UAT check in the saved notice", async () => {
    hooks.check.mockResolvedValue({
      repo: { ok: true, version: "1", detail: null },
      envs: { UAT: { ok: false, version: null, detail: "HTTP 503" } },
    });
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    expect(await screen.findByText(/Verifica: problemi su UAT/)).toBeInTheDocument();
    expect(screen.getByText("Applicazione salvata")).toBeInTheDocument();
  });

  it("shows no warning when every target is ok", async () => {
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    await screen.findByText("Applicazione salvata");
    await waitFor(() => expect(screen.queryByText("Verifica in corso…")).not.toBeInTheDocument());
    expect(screen.queryByText(/Verifica:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Verifica non disponibile")).not.toBeInTheDocument();
  });

  it("shows the check as in progress while it is pending", async () => {
    hooks.check.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    expect(await screen.findByText("Verifica in corso…")).toBeInTheDocument();
  });

  it("shows 'Verifica non disponibile' when the check request fails", async () => {
    hooks.check.mockRejectedValue(new ApiError(502, null));
    const user = userEvent.setup();
    render(<CatalogPage />);
    await saveNewApplication(user);
    expect(await screen.findByText("Verifica non disponibile")).toBeInTheDocument();
  });

  it("sends hidden from the product form and shows the nascosto badge in the list", async () => {
    hooks.products.mockReturnValue({
      data: [{ ...products[0], hidden: true }, products[1], products[2]],
      isLoading: false,
      error: null,
    });
    const user = userEvent.setup();
    render(<CatalogPage />);
    const core = screen.getByRole("region", { name: "Area Core" });
    expect(within(core).getByText("nascosto")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Area TouchPoint" })).queryByText("nascosto")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Modifica prodotto Empty" }));
    await user.click(screen.getByLabelText("Nascondi dalla status page"));
    await user.click(screen.getByRole("button", { name: "Salva prodotto" }));
    await waitFor(() =>
      expect(hooks.saveProduct).toHaveBeenCalledWith(expect.objectContaining({ id: "p2", name: "Empty", hidden: true })),
    );
  });

  it("shows manuale, nascosta and nascosta (prodotto) badges in the application table", () => {
    hooks.products.mockReturnValue({
      data: [{ ...products[0], hidden: true }, products[1], products[2]],
      isLoading: false,
      error: null,
    });
    hooks.applications.mockReturnValue({
      data: [
        { ...app, id: "m", name: "Manual App", version_source: "MANUAL", manual_versions: { DEV: null, UAT: null, PROD: null } },
        { ...app, id: "h", name: "Hidden App", product_id: "p3", hidden: true },
        { ...app, id: "ph", name: "Product Hidden App" },
        { ...app, id: "n", name: "Plain App", product_id: "p3" },
      ],
    });
    render(<CatalogPage />);
    const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    expect(within(row("Manual App")).getByText("manuale")).toBeInTheDocument();
    expect(within(row("Manual App")).getByText("nascosta (prodotto)")).toBeInTheDocument();
    expect(within(row("Hidden App")).getByText("nascosta")).toBeInTheDocument();
    expect(within(row("Product Hidden App")).getByText("nascosta (prodotto)")).toBeInTheDocument();
    expect(within(row("Plain App")).queryByText(/nascosta|manuale/)).not.toBeInTheDocument();
  });
});
