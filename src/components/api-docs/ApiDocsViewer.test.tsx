import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiDocsViewer } from "./ApiDocsViewer";

const mocks = vi.hoisted(() => ({ apiClient: vi.fn(), swagger: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiClient: mocks.apiClient,
  API_BASE_URL: "https://gateway.example/qa/central-hub/v1",
}));
vi.mock("swagger-ui-dist/swagger-ui-bundle", () => ({ default: mocks.swagger }));
vi.mock("swagger-ui-dist/swagger-ui.css", () => ({}));

const spec = { openapi: "3.1.0", info: { title: "QA Hub API" }, paths: { "/api/v1/health": {} } };

describe("ApiDocsViewer", () => {
  beforeEach(() => {
    mocks.apiClient.mockReset();
    mocks.swagger.mockReset();
  });

  it("reads the specification through the API client, not from the built-in openapi.json", async () => {
    mocks.apiClient.mockResolvedValue(spec);
    render(<ApiDocsViewer />);
    await waitFor(() => expect(mocks.swagger).toHaveBeenCalledOnce());
    expect(mocks.apiClient).toHaveBeenCalledWith("/api/v1/meta/openapi");
  });

  it("targets the gateway base URL and offers Try it out for GET only", async () => {
    mocks.apiClient.mockResolvedValue(spec);
    render(<ApiDocsViewer />);
    await waitFor(() => expect(mocks.swagger).toHaveBeenCalledOnce());
    const options = mocks.swagger.mock.calls[0][0];
    expect(options.spec.servers).toEqual([{ url: "https://gateway.example/qa/central-hub/v1" }]);
    expect(options.spec.paths).toEqual(spec.paths);
    expect(options.supportedSubmitMethods).toEqual(["get"]);
    expect(options.deepLinking).toBe(true);
    expect(options.domNode).toBe(screen.getByLabelText("Documentazione API"));
  });

  it("shows a readable error with the APIM hint when the specification cannot be loaded", async () => {
    mocks.apiClient.mockRejectedValue(new Error("404"));
    render(<ApiDocsViewer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("reimportata la specifica in APIM");
    expect(mocks.swagger).not.toHaveBeenCalled();
  });

  it("does not mount Swagger UI when the page is left before the specification arrives", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.apiClient.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { unmount } = render(<ApiDocsViewer />);
    unmount();
    resolve(spec);
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.swagger).not.toHaveBeenCalled();
  });
});
