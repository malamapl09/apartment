import { describe, it, expect } from "vitest";
import { formatGroupLabel } from "@/lib/visitors/helpers";

/**
 * The first-arrival decision now lives in SQL (recompute_visitor_status
 * returns a boolean under FOR UPDATE), so the JS helper that used to gate
 * notifications was deleted. formatGroupLabel is the only remaining pure
 * helper worth unit-testing.
 */

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
