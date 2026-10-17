import { describe, expect, it } from "vitest";
import { featureKeyForPath } from "./features";

describe("featureKeyForPath", () => {
  it.each([
    ["/", "overview"],
    ["/e2e/runs/123", "e2e"],
    ["/nrt-metrics/", null],
    ["/metrics", null],
    ["/data-hub/psp-fees", "psp_fees"],
    ["/data-hub/gpd-positions", "gpd_positions"],
    ["/data-quality/catalog", "dq_catalog"],
    ["/data-quality/domains", "dq_domains"],
    ["/settings/integrations", "settings_e2e"],
    ["/settings/bdd", "settings_gherkin"],
    ["/settings/users", null],
  ])("maps %s to feature %s", (pathname, expectedKey) => {
    expect(featureKeyForPath(pathname)).toBe(expectedKey);
  });
});
