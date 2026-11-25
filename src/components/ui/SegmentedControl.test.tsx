import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "positivo", label: "Positivo" },
  { value: "negativo", label: "Negativo" },
] as const;

function renderControl(props: Partial<Parameters<typeof SegmentedControl<"positivo" | "negativo">>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <SegmentedControl label="Polarità" value="positivo" options={[...OPTIONS]} onChange={onChange} {...props} />,
  );
  return { onChange };
}

describe("SegmentedControl", () => {
  it("renders a radiogroup named by its label with the selected option checked", () => {
    renderControl();
    const group = screen.getByRole("radiogroup", { name: "Polarità" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Positivo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Negativo" })).not.toBeChecked();
  });

  it("calls onChange with the clicked option", async () => {
    const { onChange } = renderControl();
    await userEvent.click(screen.getByRole("radio", { name: "Negativo" }));
    expect(onChange).toHaveBeenCalledWith("negativo");
  });

  it("moves the selection with the arrow keys", async () => {
    const { onChange } = renderControl();
    screen.getByRole("radio", { name: "Positivo" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("negativo");
  });

  it("disables every radio when disabled", () => {
    renderControl({ disabled: true });
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });

  it("shows the pointer cursor only while enabled", () => {
    const { unmount } = render(
      <SegmentedControl label="Polarità" value="positivo" options={[...OPTIONS]} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("radio", { name: "Negativo" }).closest("label")!.className).toContain("cursor-pointer");
    unmount();
    renderControl({ disabled: true });
    const label = screen.getByRole("radio", { name: "Negativo" }).closest("label")!;
    expect(label.className).toContain("cursor-not-allowed");
    expect(label.className).not.toContain("cursor-pointer");
  });

  it("renders only the selected label as text when read-only", () => {
    renderControl({ readOnly: true, value: "negativo" });
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText("Negativo")).toBeInTheDocument();
    expect(screen.queryByText("Positivo")).not.toBeInTheDocument();
  });
});
