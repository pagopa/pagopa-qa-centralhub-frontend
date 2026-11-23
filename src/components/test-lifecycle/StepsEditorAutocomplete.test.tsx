import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StepsEditor } from "./StepsEditor";

const mocks = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock("@/hooks/useTestLifecycle", () => ({
  useTlStepSuggestions: (q: string, keyword: string | null) => {
    mocks.calls.push([q, keyword]);
    return {
      data:
        q.length >= 2
          ? [
              { keyword: "given", text: "un utente registrato", occurrences: 4, implemented: true },
              { keyword: "given", text: "un utente anonimo", occurrences: 1, implemented: false },
            ]
          : [],
    };
  },
}));

function Harness({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <StepsEditor
      autocomplete
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("StepsEditor autocomplete", () => {
  it("suggests steps for the current keyword and picks one with the keyboard", async () => {
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "Step" });
    await userEvent.type(box, "Dato un ut");
    expect(mocks.calls.at(-1)).toEqual(["un ut", "given"]);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("implementato");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(box).toHaveValue("Dato un utente anonimo");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Enter inserts a new line when the menu is closed", async () => {
    render(<Harness />);
    const box = screen.getByRole("textbox", { name: "Step" });
    await userEvent.type(box, "Dato un ut");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(box).toHaveValue("Dato un ut\n");
  });

  it("does not suggest when read-only", () => {
    render(<StepsEditor autocomplete readOnly value="Dato un ut" />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
