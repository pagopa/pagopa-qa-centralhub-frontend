import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FilePreview } from "./FilePreview";

const FILE = `# qa-hub: FEAT_001_FdR3
# language: it
@FDR3_001 @integration
Funzionalità: Pagamento

  @runnable @positive
  @FDR3_001_01
  Scenario: Paga
    Dato un carrello
    Quando paga
`;

const mocks = vi.hoisted(() => ({
  data: undefined as { file: string; errors: { line: number; message: string; scenario_tag: string | null }[] } | undefined,
}));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlPreview: () => ({ data: mocks.data, isLoading: false, isError: false }),
}));

describe("FilePreview", () => {
  beforeEach(() => {
    mocks.data = { file: FILE, errors: [] };
  });

  it("keeps the plain text of the file readable and selectable", () => {
    render(<FilePreview featureId="f1" revisionId="r1" />);
    const pre = screen.getByLabelText("Anteprima file");
    expect(pre.textContent).toBe(FILE);
  });

  it("colours keywords, tags and comments", () => {
    render(<FilePreview featureId="f1" revisionId="r1" />);
    const pre = screen.getByLabelText("Anteprima file");
    const kinds = (text: string) => within(pre).getByText(text).getAttribute("data-kind");
    expect(kinds("Funzionalità:")).toBe("keyword");
    expect(kinds("Scenario:")).toBe("keyword");
    expect(kinds("Dato")).toBe("keyword");
    expect(kinds("@integration")).toBe("tag");
    expect(kinds("@runnable")).toBe("tag");
    expect(kinds("@FDR3_001_01")).toBe("tag");
    expect(kinds("# language: it")).toBe("comment");
  });

  it("copies the exact plain file", async () => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    render(<FilePreview featureId="f1" revisionId="r1" />);
    await user.click(screen.getByRole("button", { name: /Copia/ }));
    expect(write).toHaveBeenCalledWith(FILE);
  });

  it("lists the validation errors above the file", () => {
    mocks.data = { file: FILE, errors: [{ line: 3, message: "Riga non valida", scenario_tag: "@FDR3_001_01" }] };
    render(<FilePreview featureId="f1" revisionId="r1" />);
    expect(screen.getByText(/@FDR3_001_01 · Riga 3: Riga non valida/)).toBeInTheDocument();
  });
});
