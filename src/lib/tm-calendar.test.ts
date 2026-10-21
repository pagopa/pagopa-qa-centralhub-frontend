import { describe, expect, it } from "vitest";
import { easterSunday, italianHolidays, isWeekend } from "./tm-calendar";

describe("tm-calendar", () => {
  it("computes Easter", () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
  });

  it("puts Easter Monday on the day after Easter, also across month ends", () => {
    expect(italianHolidays(2027, 3)).toEqual(new Set([28, 29]));
    expect(italianHolidays(2027, 4)).toEqual(new Set([25]));
    expect(italianHolidays(2026, 4)).toEqual(new Set([5, 6, 25]));
  });

  it("lists the fixed holidays of the month", () => {
    expect(italianHolidays(2026, 8)).toEqual(new Set([15]));
    expect(italianHolidays(2026, 12)).toEqual(new Set([8, 25, 26]));
  });

  it("detects weekends", () => {
    expect(isWeekend(2026, 10, 17)).toBe(true);
    expect(isWeekend(2026, 10, 16)).toBe(false);
  });
});
