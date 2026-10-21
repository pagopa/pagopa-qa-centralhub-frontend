import { describe, expect, it } from "vitest";
import { validateDqCode, validateSodaUrl } from "@/lib/dq-codes";

describe("validateDqCode", () => {
  it("accepts a code matching the category and DQ dimension", () => {
    expect(validateDqCode("fld__vld__createddate__date_format", "puntuale", "Validità")).toBeNull();
  });

  it("rejects a code whose prefix does not match the category", () => {
    expect(validateDqCode("fld__vld__createddate__date_format", "intra_entita", "Validità")).not.toBeNull();
  });

  it("rejects a code whose dimension token does not match the selected dimension", () => {
    expect(validateDqCode("fld__cns__createddate__date_format", "puntuale", "Validità")).not.toBeNull();
  });

  it("rejects codes that do not have four standard segments", () => {
    expect(validateDqCode("fld__vld__createddate", "puntuale", "Validità")).not.toBeNull();
  });

  it("accepts only absolute HTTP or HTTPS SODA URLs", () => {
    expect(validateSodaUrl("https://cloud.soda.io/checks/123")).toBeNull();
    expect(validateSodaUrl("javascript:alert(1)")).not.toBeNull();
  });
});