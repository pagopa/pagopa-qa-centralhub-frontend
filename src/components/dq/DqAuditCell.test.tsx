import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DqAuditCell } from "@/components/dq/DqAuditCell";

describe("DqAuditCell", () => {
  it("shows the timestamp and the user who performed the action", () => {
    render(
      <table>
        <tbody>
          <tr>
            <DqAuditCell date="2026-10-14T10:30:00Z" user="qa@example.com" />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText("qa@example.com")).toBeInTheDocument();
    expect(screen.getByText("14/10/2026, 12:30")).toBeInTheDocument();
  });
});