/**
 * Unit tests for pure helper functions in lib/actions/reports.ts
 *
 * The functions under test (escapeCsvCell, validateMonthYear) are not
 * exported from the module — they are private helpers. We copy their
 * implementations here so we can test the exact logic that lives in
 * production without needing to load the "use server" module (which
 * depends on Next.js and Supabase at import time).
 *
 * If the helpers are ever extracted to a shared utility file and exported,
 * replace the local copies below with direct imports.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Inline implementations — must stay in sync with lib/actions/reports.ts
// ---------------------------------------------------------------------------

function escapeCsvCell(value: string): string {
  let sanitized = value.replace(/^[=+\-@\t\r]+/, "");
  sanitized = sanitized.replace(/"/g, '""');
  return `"${sanitized}"`;
}

function validateMonthYear(month: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Invalid month";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return "Invalid year";
  return null;
}

// ---------------------------------------------------------------------------
// escapeCsvCell
// ---------------------------------------------------------------------------

describe("escapeCsvCell", () => {
  describe("wrapping", () => {
    it("always wraps the output in double quotes", () => {
      const result = escapeCsvCell("hello");
      expect(result).toBe('"hello"');
    });

    it("wraps an empty string as two double quotes", () => {
      expect(escapeCsvCell("")).toBe('""');
    });
  });

  describe("formula injection prevention — leading special characters", () => {
    const formulaLeaders = ["=", "+", "-", "@", "\t", "\r"];

    formulaLeaders.forEach((char) => {
      it(`strips a leading '${JSON.stringify(char)}' to prevent Excel formula injection`, () => {
        const result = escapeCsvCell(`${char}SUM(A1:A10)`);
        expect(result).toBe('"SUM(A1:A10)"');
      });
    });

    it("strips multiple consecutive leading formula characters", () => {
      expect(escapeCsvCell("=+=SUM(1)")).toBe('"SUM(1)"');
    });

    it("does not strip formula characters that appear mid-string", () => {
      expect(escapeCsvCell("amount=100")).toBe('"amount=100"');
    });

    it("does not strip a leading character that is not in the dangerous set", () => {
      expect(escapeCsvCell("!important")).toBe('"!important"');
    });
  });

  describe("embedded double-quote escaping", () => {
    it('doubles an embedded double-quote so CSV parsers read it correctly', () => {
      expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
    });

    it("handles multiple embedded double-quotes", () => {
      expect(escapeCsvCell('"a","b"')).toBe('"""a"",""b"""');
    });

    it("handles a value that is only a double-quote", () => {
      expect(escapeCsvCell('"')).toBe('""""');
    });
  });

  describe("real-world values", () => {
    it("handles plain apartment unit numbers", () => {
      expect(escapeCsvCell("4B")).toBe('"4B"');
    });

    it("handles fee type names with commas (important for CSV)", () => {
      expect(escapeCsvCell("Maintenance, General")).toBe('"Maintenance, General"');
    });

    it("handles a value that starts with a minus (negative-looking number string)", () => {
      // Leading '-' is stripped because it could trigger a formula in Excel
      expect(escapeCsvCell("-1500")).toBe('"1500"');
    });

    it("handles a value that starts with a plus sign", () => {
      expect(escapeCsvCell("+100")).toBe('"100"');
    });

    it("handles N/A fallback strings", () => {
      expect(escapeCsvCell("N/A")).toBe('"N/A"');
    });

    it("handles ISO date strings", () => {
      expect(escapeCsvCell("2025-01-15")).toBe('"2025-01-15"');
    });

    it("handles period strings like '1/2025'", () => {
      expect(escapeCsvCell("1/2025")).toBe('"1/2025"');
    });
  });
});

// ---------------------------------------------------------------------------
// validateMonthYear
// ---------------------------------------------------------------------------

describe("validateMonthYear", () => {
  describe("valid inputs", () => {
    it("returns null for the minimum valid month (1)", () => {
      expect(validateMonthYear(1, 2024)).toBeNull();
    });

    it("returns null for the maximum valid month (12)", () => {
      expect(validateMonthYear(12, 2024)).toBeNull();
    });

    it("returns null for a mid-range month", () => {
      expect(validateMonthYear(6, 2024)).toBeNull();
    });

    it("returns null for the boundary year 2000", () => {
      expect(validateMonthYear(1, 2000)).toBeNull();
    });

    it("returns null for the boundary year 2100", () => {
      expect(validateMonthYear(1, 2100)).toBeNull();
    });

    it("returns null for a typical current-year combination", () => {
      expect(validateMonthYear(3, 2026)).toBeNull();
    });
  });

  describe("invalid month", () => {
    it("returns 'Invalid month' for month 0", () => {
      expect(validateMonthYear(0, 2024)).toBe("Invalid month");
    });

    it("returns 'Invalid month' for month 13", () => {
      expect(validateMonthYear(13, 2024)).toBe("Invalid month");
    });

    it("returns 'Invalid month' for a negative month", () => {
      expect(validateMonthYear(-1, 2024)).toBe("Invalid month");
    });

    it("returns 'Invalid month' for a float month", () => {
      expect(validateMonthYear(1.5, 2024)).toBe("Invalid month");
    });

    it("returns 'Invalid month' for NaN month", () => {
      expect(validateMonthYear(NaN, 2024)).toBe("Invalid month");
    });

    it("returns 'Invalid month' for Infinity month", () => {
      expect(validateMonthYear(Infinity, 2024)).toBe("Invalid month");
    });
  });

  describe("invalid year", () => {
    it("returns 'Invalid year' for year 1999 (below minimum)", () => {
      expect(validateMonthYear(1, 1999)).toBe("Invalid year");
    });

    it("returns 'Invalid year' for year 2101 (above maximum)", () => {
      expect(validateMonthYear(1, 2101)).toBe("Invalid year");
    });

    it("returns 'Invalid year' for year 0", () => {
      expect(validateMonthYear(1, 0)).toBe("Invalid year");
    });

    it("returns 'Invalid year' for a float year", () => {
      expect(validateMonthYear(1, 2024.5)).toBe("Invalid year");
    });

    it("returns 'Invalid year' for NaN year", () => {
      expect(validateMonthYear(1, NaN)).toBe("Invalid year");
    });

    it("returns 'Invalid year' for Infinity year", () => {
      expect(validateMonthYear(1, Infinity)).toBe("Invalid year");
    });
  });

  describe("month is checked before year", () => {
    it("reports 'Invalid month' when both month and year are invalid", () => {
      // The function checks month first, so month error takes priority
      expect(validateMonthYear(0, 1990)).toBe("Invalid month");
    });
  });
});
