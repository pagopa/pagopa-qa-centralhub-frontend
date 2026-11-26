import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReopenDialog } from "./ReopenDialog";

function setup(props: Partial<Parameters<typeof ReopenDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onClose: vi.fn() };
  render(
    <ReopenDialog
      open
      defaultBranch="qa-hub/FEAT_001_FdR3-r2"
      busy={false}
      error={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("ReopenDialog", () => {
  it("says a feature branch is opened for the changes and that an existing one is reused", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/feature branch/i);
    expect(dialog).toHaveTextContent(/esiste già.* (viene )?usato|riutilizzato/i);
  });

  it("proposes the default branch name in an editable field", () => {
    setup();
    expect(screen.getByLabelText("Nome del branch")).toHaveValue("qa-hub/FEAT_001_FdR3-r2");
  });

  it("confirms with no name when the proposal is left as it is", async () => {
    const h = setup();
    await userEvent.click(screen.getByRole("button", { name: "Riapri" }));
    expect(h.onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("confirms with the edited name, trimmed", async () => {
    const h = setup();
    const field = screen.getByLabelText("Nome del branch");
    await userEvent.clear(field);
    await userEvent.type(field, "  feature/pos-fix ");
    await userEvent.click(screen.getByRole("button", { name: "Riapri" }));
    expect(h.onConfirm).toHaveBeenCalledWith("feature/pos-fix");
  });

  it("cancel closes without confirming", async () => {
    const h = setup();
    await userEvent.click(screen.getByRole("button", { name: "Annulla" }));
    expect(h.onClose).toHaveBeenCalled();
    expect(h.onConfirm).not.toHaveBeenCalled();
  });

  it("shows the error and disables the confirmation while busy", () => {
    setup({ busy: true, error: "Nome del branch non valido" });
    expect(screen.getByRole("alert")).toHaveTextContent("Nome del branch non valido");
    expect(screen.getByRole("button", { name: "Riapri" })).toBeDisabled();
  });
});
