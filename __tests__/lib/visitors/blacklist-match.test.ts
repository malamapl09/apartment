import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { matchesBlacklist, isVisitorExpired } from "@/lib/visitors/helpers";

/**
 * Pure-JS mirror tests for the blacklist matching logic. The SQL RPC is the
 * authoritative implementation; this JS helper is used for testing and for
 * any client-side pre-check we might add later.
 */

const base = { name: "", id_number: null as string | null, phone: null as string | null };

describe("matchesBlacklist", () => {
  it("returns false when no entries", () => {
    expect(matchesBlacklist({ name: "John" }, [])).toBe(false);
  });

  it("matches exact id_number", () => {
    const entries = [{ ...base, name: "Someone Else", id_number: "12345" }];
    expect(matchesBlacklist({ name: "John", id_number: "12345" }, entries)).toBe(true);
  });

  it("matches exact phone", () => {
    const entries = [{ ...base, name: "Someone Else", phone: "809-555-1234" }];
    expect(matchesBlacklist({ name: "John", phone: "809-555-1234" }, entries)).toBe(true);
  });

  it("matches name case-insensitively", () => {
    const entries = [{ ...base, name: "John Doe" }];
    expect(matchesBlacklist({ name: "john doe" }, entries)).toBe(true);
    expect(matchesBlacklist({ name: "JOHN DOE" }, entries)).toBe(true);
    expect(matchesBlacklist({ name: "  John Doe  " }, entries)).toBe(true);
  });

  it("does not match on partial / substring", () => {
    const entries = [{ ...base, name: "John Doe" }];
    expect(matchesBlacklist({ name: "John" }, entries)).toBe(false);
  });

  it("does not match on empty id_number vs null entry", () => {
    const entries = [{ ...base, name: "Someone", id_number: null }];
    expect(matchesBlacklist({ name: "Different", id_number: "" }, entries)).toBe(false);
  });

  it("any one signal is enough", () => {
    const entries = [{ ...base, name: "Jane", id_number: "99999" }];
    // name differs, but id matches
    expect(matchesBlacklist({ name: "Unknown", id_number: "99999" }, entries)).toBe(true);
    // id is undefined, but name matches
    expect(matchesBlacklist({ name: "Jane" }, entries)).toBe(true);
  });

  it("returns false when candidate has no matchable signals", () => {
    const entries = [{ ...base, name: "Jane", id_number: "99999", phone: "555" }];
    expect(matchesBlacklist({ name: "Different", id_number: "000", phone: "111" }, entries)).toBe(false);
  });
});

describe("isVisitorExpired", () => {
  const FROZEN_NOW = new Date("2026-04-20T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for an expected visitor past valid_until", () => {
    expect(
      isVisitorExpired({
        status: "expected",
        valid_until: "2026-04-19T18:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false for an expected visitor still within the window", () => {
    expect(
      isVisitorExpired({
        status: "expected",
        valid_until: "2026-04-20T18:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("returns false for already checked_in visitors even if past the window", () => {
    expect(
      isVisitorExpired({
        status: "checked_in",
        valid_until: "2026-04-19T18:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("returns false for cancelled visitors", () => {
    expect(
      isVisitorExpired({
        status: "cancelled",
        valid_until: "2026-04-19T18:00:00.000Z",
      }),
    ).toBe(false);
  });
});
