/**
 * Unit tests for the ILIKE wildcard-escaping logic in lib/actions/search.ts
 *
 * The escape expression lives inline inside globalSearch():
 *
 *   const escaped = query.trim().replace(/[%_\\]/g, "\\$&");
 *   const searchTerm = `%${escaped}%`;
 *
 * We extract that logic into a local helper below so it can be tested in
 * isolation without loading the "use server" module (which has side-effects
 * that require Next.js / Supabase at import time).
 *
 * If this logic is ever extracted to a shared utility and exported, replace
 * the local helper with a direct import.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Inline implementation — must stay in sync with lib/actions/search.ts
// ---------------------------------------------------------------------------

/**
 * Builds the ILIKE search term used in Supabase queries.
 * Trims the raw query, escapes ILIKE wildcard characters (%, _, \),
 * and wraps the result in % wildcards for a "contains" match.
 */
function buildSearchTerm(rawQuery: string): string {
  const escaped = rawQuery.trim().replace(/[%_\\]/g, "\\$&");
  return `%${escaped}%`;
}

/**
 * Mirrors the minimum-length guard in globalSearch().
 * Returns true when the query is long enough to trigger a search.
 */
function isQueryLongEnough(rawQuery: string): boolean {
  return Boolean(rawQuery && rawQuery.trim().length >= 2);
}

// ---------------------------------------------------------------------------
// buildSearchTerm
// ---------------------------------------------------------------------------

describe("buildSearchTerm — ILIKE wildcard escaping", () => {
  describe("wildcard wrapping", () => {
    it("wraps a plain query in % wildcards for a 'contains' match", () => {
      expect(buildSearchTerm("apt")).toBe("%apt%");
    });

    it("wraps a single character query (guard is caller responsibility)", () => {
      expect(buildSearchTerm("a")).toBe("%a%");
    });

    it("wraps an empty string as '%%' (caller should guard this)", () => {
      expect(buildSearchTerm("")).toBe("%%");
    });
  });

  describe("trimming", () => {
    it("trims leading whitespace before building the term", () => {
      expect(buildSearchTerm("  unit")).toBe("%unit%");
    });

    it("trims trailing whitespace before building the term", () => {
      expect(buildSearchTerm("unit  ")).toBe("%unit%");
    });

    it("trims both leading and trailing whitespace", () => {
      expect(buildSearchTerm("  unit 4B  ")).toBe("%unit 4B%");
    });

    it("preserves internal spaces after trimming", () => {
      expect(buildSearchTerm("John Doe")).toBe("%John Doe%");
    });
  });

  describe("ILIKE special character escaping", () => {
    it("escapes a literal % so it matches a percent sign, not any string", () => {
      expect(buildSearchTerm("100%")).toBe("%100\\%%");
    });

    it("escapes a literal _ so it matches an underscore, not any single character", () => {
      expect(buildSearchTerm("unit_4B")).toBe("%unit\\_4B%");
    });

    it("escapes a literal backslash", () => {
      expect(buildSearchTerm("C:\\path")).toBe("%C:\\\\path%");
    });

    it("escapes multiple % characters in the same query", () => {
      expect(buildSearchTerm("50% off 20%")).toBe("%50\\% off 20\\%%");
    });

    it("escapes multiple _ characters in the same query", () => {
      expect(buildSearchTerm("reference_code_001")).toBe("%reference\\_code\\_001%");
    });

    it("escapes a mix of %, _ and \\ in the same query", () => {
      expect(buildSearchTerm("50%_\\test")).toBe("%50\\%\\_\\\\test%");
    });
  });

  describe("characters that should NOT be escaped", () => {
    it("does not escape a hyphen", () => {
      expect(buildSearchTerm("unit-4B")).toBe("%unit-4B%");
    });

    it("does not escape a forward slash (used in reference codes like MR-2025/01)", () => {
      expect(buildSearchTerm("MR-2025/01")).toBe("%MR-2025/01%");
    });

    it("does not escape an at-sign", () => {
      expect(buildSearchTerm("owner@example.com")).toBe("%owner@example.com%");
    });

    it("does not escape digits or uppercase letters", () => {
      expect(buildSearchTerm("APT101")).toBe("%APT101%");
    });
  });

  describe("real-world search values", () => {
    it("handles a unit number query", () => {
      expect(buildSearchTerm("4B")).toBe("%4B%");
    });

    it("handles an email query", () => {
      expect(buildSearchTerm("mario@example.com")).toBe("%mario@example.com%");
    });

    it("handles a maintenance reference code query", () => {
      expect(buildSearchTerm("MR-001")).toBe("%MR-001%");
    });

    it("handles a tracking number query", () => {
      expect(buildSearchTerm("1Z999AA10123456784")).toBe("%1Z999AA10123456784%");
    });
  });
});

// ---------------------------------------------------------------------------
// isQueryLongEnough
// ---------------------------------------------------------------------------

describe("isQueryLongEnough — minimum-length guard", () => {
  it("returns false for an empty string", () => {
    expect(isQueryLongEnough("")).toBe(false);
  });

  it("returns false for a single character", () => {
    expect(isQueryLongEnough("a")).toBe(false);
  });

  it("returns false for a string that is only whitespace", () => {
    expect(isQueryLongEnough("  ")).toBe(false);
  });

  it("returns false for a single character surrounded by whitespace", () => {
    expect(isQueryLongEnough(" a ")).toBe(false);
  });

  it("returns true for exactly two characters", () => {
    expect(isQueryLongEnough("ab")).toBe(true);
  });

  it("returns true for two characters surrounded by whitespace", () => {
    expect(isQueryLongEnough(" ab ")).toBe(true);
  });

  it("returns true for a typical unit number query", () => {
    expect(isQueryLongEnough("4B")).toBe(true);
  });

  it("returns true for a longer query", () => {
    expect(isQueryLongEnough("maintenance request")).toBe(true);
  });
});
