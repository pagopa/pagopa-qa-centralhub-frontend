import { Activity, Bell, ClipboardCheck, ShieldCheck } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  bellLabel,
  bellState,
  bellTone,
  formatBadge,
  groupByDay,
  relativeTimeIt,
  severityCounts,
  typeMeta,
} from "@/lib/messaging";
import type { InboxItem } from "@/types/messaging";

function item(overrides: Partial<InboxItem> & { id: string }): InboxItem {
  return {
    title: "t",
    body: "b",
    link: null,
    severity: "info",
    type: "x",
    created_at: "2026-11-22T08:00:00",
    read_at: null,
    auto_read: false,
    ...overrides,
  };
}

describe("bellState", () => {
  it("tells no messages, all read and unread apart", () => {
    expect(bellState({ unread: 0, total: 0, max_unread_severity: null })).toBe("empty");
    expect(bellState({ unread: 0, total: 4, max_unread_severity: null })).toBe("read");
    expect(bellState({ unread: 2, total: 4, max_unread_severity: "warning" })).toBe("unread");
  });

  it("is unknown while the summary is not available", () => {
    expect(bellState(undefined)).toBe("unknown");
  });
});

describe("formatBadge", () => {
  it.each([
    [1, "1"],
    [9, "9"],
    [10, "9+"],
    [120, "9+"],
  ])("formats %i as %s", (count, expected) => {
    expect(formatBadge(count)).toBe(expected);
  });
});

describe("bellLabel", () => {
  it("describes each state in Italian", () => {
    expect(bellLabel({ unread: 0, total: 0, max_unread_severity: null })).toBe("Nessun messaggio");
    expect(bellLabel({ unread: 0, total: 3, max_unread_severity: null })).toBe(
      "Tutti i messaggi sono stati letti",
    );
    expect(bellLabel({ unread: 1, total: 3, max_unread_severity: "info" })).toBe(
      "1 messaggio non letto",
    );
    expect(bellLabel({ unread: 3, total: 3, max_unread_severity: "info" })).toBe(
      "3 messaggi non letti",
    );
    expect(bellLabel(undefined)).toBe("Messaggi");
  });
});

describe("bellTone", () => {
  it("falls back to info and keeps the severity otherwise", () => {
    expect(bellTone(null)).toBe("info");
    expect(bellTone("critical")).toBe("critical");
  });
});

describe("groupByDay", () => {
  it("groups by Oggi, Ieri and the long Italian date, preserving the order", () => {
    const now = new Date("2026-11-22T10:00:00");
    const groups = groupByDay(
      [
        item({ id: "1", created_at: "2026-11-22T08:00:00" }),
        item({ id: "2", created_at: "2026-11-22T07:00:00" }),
        item({ id: "3", created_at: "2026-11-21T20:00:00" }),
        item({ id: "4", created_at: "2026-11-10T09:00:00" }),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Oggi", "Ieri", "10 novembre 2026"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "2"]);
  });
});

describe("severityCounts", () => {
  it("counts unread messages only", () => {
    const counts = severityCounts([
      item({ id: "1", severity: "warning" }),
      item({ id: "2", severity: "warning" }),
      item({ id: "3", severity: "info" }),
      item({ id: "4", severity: "critical", read_at: "2026-11-22T09:00:00" }),
    ]);
    expect(counts).toEqual({ info: 1, warning: 2, critical: 0 });
  });
});

describe("typeMeta", () => {
  it("maps the known types and falls back to a generic one", () => {
    expect(typeMeta("it.pagopa.qa.quality_gate.run.completed")).toMatchObject({
      label: "Quality Gate",
      icon: ShieldCheck,
      cta: "Apri report",
    });
    expect(typeMeta("it.pagopa.qa.nrt.reviews.pending")).toMatchObject({
      label: "NRT",
      icon: ClipboardCheck,
      cta: "Vai agli NRT",
    });
    expect(typeMeta("it.pagopa.qa.sanp_health.checks.failing")).toMatchObject({
      label: "SANP Health",
      icon: Activity,
      cta: "Apri SANP Health",
    });
    expect(typeMeta("something.else")).toMatchObject({ label: "Sistema", icon: Bell, cta: "Apri" });
  });
});

describe("relativeTimeIt", () => {
  const now = new Date("2026-11-22T12:00:00");
  it.each([
    ["2026-11-22T11:59:40", "adesso"],
    ["2026-11-22T11:59:00", "1 minuto fa"],
    ["2026-11-22T11:48:00", "12 minuti fa"],
    ["2026-11-22T11:00:00", "1 ora fa"],
    ["2026-11-22T09:00:00", "3 ore fa"],
    ["2026-11-21T11:00:00", "1 giorno fa"],
    ["2026-11-19T11:00:00", "3 giorni fa"],
  ])("formats %s as %s", (stamp, expected) => {
    expect(relativeTimeIt(stamp, now)).toBe(expected);
  });
});
