import { describe, expect, it } from "vitest";
import { featureKeyForPath } from "./features";

describe("featureKeyForPath", () => {
  it.each([
    ["/", "overview"],
    ["/nrt-metrics/", null],
    ["/metrics", null],
    ["/data-hub/psp-fees", "psp_fees"],
    ["/data-hub/gpd-positions", "gpd_positions"],
    ["/data-quality/catalog", "dq_catalog"],
    ["/data-quality/domains", "dq_domains"],
    ["/settings/bdd", "settings_gherkin"],
    ["/settings/users", null],
  ])("maps %s to feature %s", (pathname, expectedKey) => {
    expect(featureKeyForPath(pathname)).toBe(expectedKey);
  });
});
