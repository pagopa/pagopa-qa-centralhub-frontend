import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BranchDivergenceDialog } from "./BranchDivergenceDialog";

function setup(props: Partial<Parameters<typeof BranchDivergenceDialog>[0]> = {}) {
  const handlers = { onAccept: vi.fn(), onOverwrite: vi.fn(), onClose: vi.fn() };
  render(
    <BranchDivergenceDialog
      open
      state="repo_ahead"
      compareUrl="https://github.com/org/repo/compare/main...qa-hub/x-r1"
      busy={false}
      error={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("BranchDivergenceDialog", () => {
  it("explains that the file changed on the repository", () => {
    setup();
    expect(screen.getByRole("dialog")).toHaveTextContent(/modificato fuori dall'hub/i);
  });

  it("says both sides changed and what accepting costs", () => {
    setup({ state: "diverged" });
    expect(screen.getByRole("dialog")).toHaveTextContent(/sia sul repo sia nell'hub/i);
    expect(screen.getByRole("dialog")).toHaveTextContent(/modifiche dell'hub .* andranno perse/i);
  });

  it("offers the two choices and a way to decide later", async () => {
    const h = setup();
    await userEvent.click(screen.getByRole("button", { name: "Accetta la versione del repo" }));
    expect(h.onAccept).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Sovrascrivi il repo con l'hub" }));
    expect(h.onOverwrite).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Decido dopo" }));
    expect(h.onClose).toHaveBeenCalled();
  });

  it("links the comparison on GitHub only when it is an http(s) url", () => {
    setup();
    expect(screen.getByRole("link", { name: /differenze su GitHub/i })).toHaveAttribute(
      "href",
      "https://github.com/org/repo/compare/main...qa-hub/x-r1",
    );
  });

  it("shows no link without a comparison url", () => {
    setup({ compareUrl: null });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("disables the choices while busy and shows an error", () => {
    setup({ busy: true, error: "Salvataggio non riuscito" });
    expect(screen.getByRole("button", { name: "Accetta la versione del repo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sovrascrivi il repo con l'hub" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Salvataggio non riuscito");
  });
});
