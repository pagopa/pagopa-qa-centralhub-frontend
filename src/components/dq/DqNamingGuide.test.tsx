import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DqNamingGuide } from "@/components/dq/DqNamingGuide";

describe("DqNamingGuide", () => {
  it("explains domain check identifiers and links the documentation", () => {
    render(<DqNamingGuide />);

    expect(screen.getByRole("link", { name: "Documentazione tecnica" })).toHaveAttribute(
      "href",
      "https://pagopa.atlassian.net/wiki/spaces/QDP/pages/3291218056/Documentazione+Tecnica",
    );
    expect(screen.getByRole("link", { name: "GDR-003 Naming Convention" })).toHaveAttribute(
      "href",
      "https://pagopa.atlassian.net/wiki/spaces/QDP/pages/2897641568/GDR-003+Naming+Convention",
    );
    expect(screen.getAllByText("fld__vld__createddate__date_format").length).toBeGreaterThan(0);
    expect(screen.getByText(/deve coincidere esattamente con il check_name in SODA/i)).toBeInTheDocument();
    expect(screen.getByText("Esempi pratici")).toBeInTheDocument();
    expect(screen.getByText("pagopa.silver_touchpoints.createddate")).toBeInTheDocument();
    expect(screen.getByText("ent__cns__validity_dates__chronological_order")).toBeInTheDocument();
    expect(screen.getByText("xref__cns__payment_option_transfer__importi_coerenti")).toBeInTheDocument();
    expect(screen.getByText("Esempio illustrativo")).toBeInTheDocument();
  });
});