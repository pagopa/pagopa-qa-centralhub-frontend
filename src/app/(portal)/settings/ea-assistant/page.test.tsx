import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./page";

const mocks = vi.hoisted(() => ({
  role: "superadmin",
  apiClient: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ role: mocks.role, isLoading: false }),
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  apiClient: mocks.apiClient,
}));

const config = {
  provider: "gemini",
  gemini_model: "gemini-model",
  groq_model: "openai/gpt-oss-120b",
  fallback_enabled: false,
  configured: { gemini: true, groq: true },
};

function setup() {
  render(
    <QueryClientProvider client={new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })}>
      <Page />
    </QueryClientProvider>,
  );
}

describe("Pagoda settings", () => {
  beforeEach(() => {
    mocks.role = "superadmin";
    mocks.apiClient.mockReset();
    mocks.replace.mockReset();
    mocks.apiClient.mockImplementation((_path, options) =>
      Promise.resolve(options?.method === "PUT"
        ? { ...config, ...JSON.parse(options.body) } : config),
    );
  });

  it("persists the engine, models and optional fallback without secrets", async () => {
    setup();
    fireEvent.change(await screen.findByLabelText("Motore principale"), { target: { value: "groq" } });
    fireEvent.change(screen.getByLabelText("Modello Groq"), { target: { value: "chosen-model" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /fallback automatico/i }));
    fireEvent.click(screen.getByRole("button", { name: "Salva impostazioni" }));
    await screen.findByRole("status");
    const put = mocks.apiClient.mock.calls.find(([, options]) => options?.method === "PUT");
    expect(JSON.parse(put![1].body)).toEqual({
      provider: "groq", gemini_model: "gemini-model", groq_model: "chosen-model",
      fallback_enabled: true,
    });
    expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
  });

  it("prevents saving a provider without a configured secret", async () => {
    mocks.apiClient.mockResolvedValue({ ...config, configured: { gemini: true, groq: false } });
    setup();
    fireEvent.change(await screen.findByLabelText("Motore principale"), { target: { value: "groq" } });
    expect(screen.getByRole("button", { name: "Salva impostazioni" })).toBeDisabled();
    expect(screen.getByText(/GROQ_API_KEY/)).toBeInTheDocument();
  });

  it("prevents enabling fallback when the secondary secret is missing", async () => {
    mocks.apiClient.mockResolvedValue({ ...config, configured: { gemini: true, groq: false } });
    setup();
    fireEvent.click(await screen.findByRole("checkbox", { name: /fallback automatico/i }));
    expect(screen.getByRole("button", { name: "Salva impostazioni" })).toBeDisabled();
  });

  it("shows load errors and allows retrying", async () => {
    mocks.apiClient.mockRejectedValue(new Error("offline"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(/caricare/i);
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();
  });

  it("shows save errors without claiming success", async () => {
    setup();
    await screen.findByLabelText("Motore principale");
    mocks.apiClient.mockRejectedValue(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Salva impostazioni" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/salvare/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not load or display settings for non-superadmins", async () => {
    mocks.role = "qa_engineer";
    setup();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.apiClient).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Motore principale")).not.toBeInTheDocument();
  });
});
