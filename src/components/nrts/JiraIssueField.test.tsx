import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JiraIssueField } from "./JiraIssueField";

describe("JiraIssueField", () => {
  it.each([
    ["product", false, "Ticket prodotto", true],
    ["product", true, "Ticket prodotto", true],
    ["qa", false, "Ticket QA", true],
    ["qa", true, "Ticket QA", false],
  ] as const)("renders %s with isTasOnly=%s", (field, isTasOnly, label, visible) => {
    render(
      <dl>
        <JiraIssueField
          field={field}
          value="QA-123"
          issueNotFound={false}
          isTasOnly={isTasOnly}
          onBlur={vi.fn()}
          onChange={vi.fn()}
        />
      </dl>,
    );

    if (visible) {
      expect(screen.getByRole("textbox", { name: label })).toHaveValue("QA-123");
    } else {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    }
  });

  it("forwards input events and displays the validation error", () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <JiraIssueField field="product" value="" issueNotFound={false} isTasOnly={false} onBlur={onBlur} onChange={onChange} />,
    );
    const input = screen.getByRole("textbox", { name: "Ticket prodotto" });

    expect(screen.queryByText("Nessuna issue Jira trovata")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "QA-123" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();

    rerender(
      <JiraIssueField field="product" value="QA-123" issueNotFound isTasOnly={false} onBlur={onBlur} onChange={onChange} />,
    );
    expect(screen.getByText("Nessuna issue Jira trovata")).toBeInTheDocument();
  });
});