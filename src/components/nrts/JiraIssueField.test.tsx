import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JiraIssueField } from "./JiraIssueField";

describe("JiraIssueField", () => {
  it.each([
    ["product", "Ticket prodotto"],
    ["qa", "Ticket QA"],
  ] as const)("renders %s with label %s", (field, label) => {
    render(
      <dl>
        <JiraIssueField
          field={field}
          value="QA-123"
          issueNotFound={false}
          onBlur={vi.fn()}
          onChange={vi.fn()}
        />
      </dl>,
    );

    expect(screen.getByText(`${label}:`)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("QA-123");
  });

  it("forwards input events and displays the validation error", () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <JiraIssueField field="product" value="" issueNotFound={false} onBlur={onBlur} onChange={onChange} />,
    );
    const input = screen.getByRole("textbox");

    expect(screen.queryByText("Nessuna issue Jira trovata")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "QA-123" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();

    rerender(
      <JiraIssueField field="product" value="QA-123" issueNotFound onBlur={onBlur} onChange={onChange} />,
    );
    expect(screen.getByText("Nessuna issue Jira trovata")).toBeInTheDocument();
  });
});
