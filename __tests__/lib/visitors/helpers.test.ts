import { describe, it, expect } from "vitest";
import { isFirstArrival, formatGroupLabel } from "@/lib/visitors/helpers";

/**
 * Pure helpers for the visitor companions feature. The DB-side
 * recompute_visitor_status is not unit-tested directly; these helpers
 * cover the JS-side notification gating logic.
 */

describe("isFirstArrival", () => {
  it("returns true when nothing has happened yet (no companions)", () => {
    expect(isFirstArrival("expected", null, [])).toBe(true);
  });

  it("returns true when nothing has happened yet (companions all expected)", () => {
    expect(
      isFirstArrival("expected", null, [
        { checked_in_at: null },
        { checked_in_at: null },
      ]),
    ).toBe(true);
  });

  it("returns false when the primary already arrived", () => {
    expect(
      isFirstArrival("expected", "2026-04-20T18:00:00Z", []),
    ).toBe(false);
  });

  it("returns false when a companion already arrived", () => {
    expect(
      isFirstArrival("expected", null, [
        { checked_in_at: null },
        { checked_in_at: "2026-04-20T18:00:00Z" },
      ]),
    ).toBe(false);
  });

  it("returns false when parent status is checked_in", () => {
    expect(isFirstArrival("checked_in", null, [])).toBe(false);
  });

  it("returns false when parent status is checked_out", () => {
    expect(isFirstArrival("checked_out", null, [])).toBe(false);
  });

  it("returns false when parent status is cancelled", () => {
    expect(isFirstArrival("cancelled", null, [])).toBe(false);
  });
});

describe("formatGroupLabel", () => {
  it("returns just the name when there are no companions", () => {
    expect(formatGroupLabel("Maria Lopez", 0)).toBe("Maria Lopez");
  });

  it("appends +N when there are companions", () => {
    expect(formatGroupLabel("Maria Lopez", 1)).toBe("Maria Lopez +1");
    expect(formatGroupLabel("Maria Lopez", 3)).toBe("Maria Lopez +3");
    expect(formatGroupLabel("Maria Lopez", 19)).toBe("Maria Lopez +19");
  });

  it("treats negative or NaN counts as zero", () => {
    expect(formatGroupLabel("Maria Lopez", -1)).toBe("Maria Lopez");
    expect(formatGroupLabel("Maria Lopez", Number.NaN)).toBe("Maria Lopez");
  });
});
