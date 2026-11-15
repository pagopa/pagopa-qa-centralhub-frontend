import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FLAKY_FILTERS } from "@/hooks/useFlaky";
import { FlakyFilters } from "./FlakyFilters";

describe("FlakyFilters", () => {
  it("changes environment, flag, minimum level and suite", async () => {
    const onChange = vi.fn();
    render(<FlakyFilters value={DEFAULT_FLAKY_FILTERS} onChange={onChange} suites={["checkout", "gpd"]} />);

    await userEvent.selectOptions(screen.getByLabelText("Ambiente"), "DEV");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, env: "DEV" });

    await userEvent.selectOptions(screen.getByLabelText("Flag"), "unflagged");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, flag: "unflagged" });

    await userEvent.selectOptions(screen.getByLabelText("Livello minimo"), "4");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, minLevel: 4 });

    await userEvent.selectOptions(screen.getByLabelText("Suite"), "gpd");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, testObjects: ["gpd"] });
  });

  it("clears the suite filter with the 'Tutte' option", async () => {
    const onChange = vi.fn();
    render(<FlakyFilters value={{ ...DEFAULT_FLAKY_FILTERS, testObjects: ["gpd"] }} onChange={onChange} suites={["checkout", "gpd"]} />);
    await userEvent.selectOptions(screen.getByLabelText("Suite"), "");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, testObjects: [] });
  });

  it("searches by scenario name", async () => {
    const onChange = vi.fn();
    render(<FlakyFilters value={DEFAULT_FLAKY_FILTERS} onChange={onChange} suites={[]} />);
    await userEvent.type(screen.getByLabelText("Cerca scenario"), "p");
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_FLAKY_FILTERS, q: "p" });
  });
});
