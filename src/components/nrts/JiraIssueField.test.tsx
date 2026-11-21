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

    expect(screen.getByRole("textbox", { name: label })).toBeInTheDocument();
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

  it("renders an open-in-Jira link only when the value contains a key", () => {
    const { rerender } = render(
      <JiraIssueField field="qa" value="PQ-825" issueNotFound={false} onBlur={vi.fn()} onChange={vi.fn()} />,
    );
    const link = screen.getByRole("link", { name: "Apri ticket Jira" });
    expect(link).toHaveAttribute("href", "https://pagopa.atlassian.net/browse/PQ-825");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");

    for (const value of ["", "hello"]) {
      rerender(<JiraIssueField field="qa" value={value} issueNotFound={false} onBlur={vi.fn()} onChange={vi.fn()} />);
      expect(screen.queryByRole("link", { name: "Apri ticket Jira" })).not.toBeInTheDocument();
    }
  });
});
