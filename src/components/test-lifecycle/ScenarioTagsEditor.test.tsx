import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenarioTagsEditor } from "./ScenarioTagsEditor";

function setup(initial: string[], props: { readOnly?: boolean; suggestions?: string[] } = {}) {
  const onChange = vi.fn();
  function Host() {
    const [value, setValue] = useState(initial);
    return (
      <ScenarioTagsEditor
        value={value}
        readOnly={props.readOnly ?? false}
        suggestions={props.suggestions ?? []}
        onChange={(tags) => {
          onChange(tags);
          setValue(tags);
        }}
      />
    );
  }
  render(<Host />);
  return { onChange };
}

describe("ScenarioTagsEditor", () => {
  it("shows the status as a radio group and the custom tags as chips", () => {
    setup(["runnable", "smoke", "checkout"]);
    const status = screen.getByRole("radiogroup", { name: "Stato" });
    expect(within(status).getByRole("radio", { name: "@runnable" })).toBeChecked();
    expect(within(status).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("@smoke")).toBeInTheDocument();
    expect(screen.getByText("@checkout")).toBeInTheDocument();
  });

  it("choosing a status changes only the status", async () => {
    const { onChange } = setup(["smoke", "runnable", "checkout"]);
    await userEvent.click(screen.getByRole("radio", { name: "@skip" }));
    expect(onChange).toHaveBeenLastCalledWith(["smoke", "skip", "checkout"]);
  });

  it("toggles @flaky without touching the others", async () => {
    const { onChange } = setup(["runnable", "smoke"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "@flaky" }));
    expect(onChange).toHaveBeenLastCalledWith(["runnable", "smoke", "flaky"]);
    await userEvent.click(screen.getByRole("checkbox", { name: "@flaky" }));
    expect(onChange).toHaveBeenLastCalledWith(["runnable", "smoke"]);
  });

  it("shows the @flaky state with a mark, not only with colour", async () => {
    setup(["runnable"]);
    expect(screen.queryByTestId("flaky-on")).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: "@flaky" }));
    expect(screen.getByTestId("flaky-on")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "@flaky" }));
    expect(screen.queryByTestId("flaky-on")).toBeNull();
  });

  it("adds a custom tag with Enter and keeps every existing one", async () => {
    const { onChange } = setup(["runnable", "smoke", "checkout"]);
    await userEvent.type(screen.getByLabelText("Nuovo tag"), "@happy_path{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["runnable", "smoke", "checkout", "happy_path"]);
    expect(screen.getByLabelText("Nuovo tag")).toHaveValue("");
  });

  it("removes a custom tag and lets it be added again", async () => {
    const { onChange } = setup(["runnable", "smoke", "checkout"]);
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi @smoke" }));
    expect(onChange).toHaveBeenLastCalledWith(["runnable", "checkout"]);
    expect(screen.queryByText("@smoke")).toBeNull();
    await userEvent.type(screen.getByLabelText("Nuovo tag"), "smoke{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["runnable", "checkout", "smoke"]);
  });

  it("refuses a reserved name with a message and adds nothing", async () => {
    const { onChange } = setup(["runnable"]);
    await userEvent.type(screen.getByLabelText("Nuovo tag"), "skip{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(/riservato/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says in words when the status is not exactly one", () => {
    setup(["smoke"]);
    expect(screen.getByText(/serve uno e un solo stato/i)).toBeInTheDocument();
  });

  it("keeps a legacy test-type tag visible and removable", async () => {
    const { onChange } = setup(["runnable", "e2e"]);
    await userEvent.click(screen.getByRole("button", { name: "Rimuovi @e2e" }));
    expect(onChange).toHaveBeenLastCalledWith(["runnable"]);
  });

  it("offers suggestions that are not reserved nor already on the scenario", () => {
    setup(["runnable", "smoke"], { suggestions: ["smoke", "checkout", "e2e", "runnable"] });
    const options = Array.from(document.querySelectorAll("datalist option")).map((o) => o.getAttribute("value"));
    expect(options).toEqual(["checkout"]);
  });

  it("is fully read-only", () => {
    setup(["runnable", "smoke"], { readOnly: true });
    expect(screen.queryByLabelText("Nuovo tag")).toBeNull();
    expect(screen.queryByRole("button", { name: /Rimuovi/ })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "@flaky" })).toBeDisabled();
    expect(screen.getByText("@smoke")).toBeInTheDocument();
  });
});
