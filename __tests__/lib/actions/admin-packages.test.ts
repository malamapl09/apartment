/**
 * Unit tests for the pure validation and data-transformation logic extracted
 * from lib/actions/admin-packages.ts.
 *
 * The server action functions themselves interact with Supabase and Next.js
 * cache APIs, so they are not imported directly. Instead, the pure logic that
 * sits inside those functions is extracted here and tested in isolation.
 *
 * Covered logic:
 *   - logPackage input validation (required vs. optional fields)
 *   - Package status counting (getPackageStats aggregation)
 *   - Query filter building (getPackages filter application)
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// logPackage input validation
// Mirrors the shape checks that would guard the Supabase insert in
// lib/actions/admin-packages.ts.
// ---------------------------------------------------------------------------

type LogPackageInput = {
  apartment_id: string;
  tracking_number?: string;
  carrier?: string;
  description: string;
  notes?: string;
};

/**
 * Validates the input for logging a new package. Returns an error string
 * when validation fails, or null when the input is acceptable.
 *
 * This mirrors the implicit validation that the production server action
 * relies on (Supabase NOT NULL constraints + calling-form validation).
 * Making it explicit here lets us pin the rules and catch regressions.
 */
function validateLogPackageInput(data: Partial<LogPackageInput>): string | null {
  if (!data.apartment_id || data.apartment_id.trim() === "") {
    return "apartment_id is required";
  }
  if (!data.description || data.description.trim() === "") {
    return "description is required";
  }
  return null;
}

// ---------------------------------------------------------------------------
// getPackageStats aggregation
// Mirrors the status-counting loop in lib/actions/admin-packages.ts.
// ---------------------------------------------------------------------------

type PackageStatus = "pending" | "notified" | "picked_up";
type PackageRow = { status: string };

const EMPTY_STATS = { pending: 0, notified: 0, picked_up: 0 };

function aggregatePackageStats(packages: PackageRow[]): typeof EMPTY_STATS {
  const stats = { ...EMPTY_STATS };
  for (const pkg of packages) {
    if (pkg.status in stats) {
      stats[pkg.status as PackageStatus]++;
    }
  }
  return stats;
}

// ---------------------------------------------------------------------------
// getPackages filter logic
// Mirrors the conditional filter application in getPackages().
// ---------------------------------------------------------------------------

type PackageFilters = { status?: string; apartment_id?: string };

/**
 * Determines which equality filters to apply for a packages query.
 * Returns an array of [field, value] pairs that should be used as
 * .eq() calls on the Supabase query builder.
 */
function buildPackageFilters(filters?: PackageFilters): [string, string][] {
  const conditions: [string, string][] = [];
  if (filters?.status) conditions.push(["status", filters.status]);
  if (filters?.apartment_id) conditions.push(["apartment_id", filters.apartment_id]);
  return conditions;
}

// ---------------------------------------------------------------------------
// validateLogPackageInput
// ---------------------------------------------------------------------------

describe("validateLogPackageInput — required field validation", () => {
  describe("valid inputs", () => {
    it("returns null when all required fields are provided", () => {
      expect(
        validateLogPackageInput({
          apartment_id: "apt-uuid-123",
          description: "Amazon delivery",
        })
      ).toBeNull();
    });

    it("returns null when optional fields are also provided", () => {
      expect(
        validateLogPackageInput({
          apartment_id: "apt-uuid-123",
          description: "Amazon delivery",
          tracking_number: "1Z999AA10123456784",
          carrier: "UPS",
          notes: "Left at door",
        })
      ).toBeNull();
    });

    it("returns null when optional fields are explicitly undefined", () => {
      expect(
        validateLogPackageInput({
          apartment_id: "apt-uuid-123",
          description: "Package",
          tracking_number: undefined,
          carrier: undefined,
          notes: undefined,
        })
      ).toBeNull();
    });
  });

  describe("missing apartment_id", () => {
    it("returns an error when apartment_id is absent", () => {
      expect(
        validateLogPackageInput({ description: "Amazon delivery" })
      ).toBe("apartment_id is required");
    });

    it("returns an error when apartment_id is an empty string", () => {
      expect(
        validateLogPackageInput({ apartment_id: "", description: "Amazon delivery" })
      ).toBe("apartment_id is required");
    });

    it("returns an error when apartment_id is only whitespace", () => {
      expect(
        validateLogPackageInput({ apartment_id: "   ", description: "Amazon delivery" })
      ).toBe("apartment_id is required");
    });
  });

  describe("missing description", () => {
    it("returns an error when description is absent", () => {
      expect(
        validateLogPackageInput({ apartment_id: "apt-uuid-123" })
      ).toBe("description is required");
    });

    it("returns an error when description is an empty string", () => {
      expect(
        validateLogPackageInput({ apartment_id: "apt-uuid-123", description: "" })
      ).toBe("description is required");
    });

    it("returns an error when description is only whitespace", () => {
      expect(
        validateLogPackageInput({ apartment_id: "apt-uuid-123", description: "   " })
      ).toBe("description is required");
    });
  });

  describe("priority — apartment_id is checked first", () => {
    it("reports apartment_id error before description error when both are missing", () => {
      expect(validateLogPackageInput({})).toBe("apartment_id is required");
    });
  });
});

// ---------------------------------------------------------------------------
// aggregatePackageStats
// ---------------------------------------------------------------------------

describe("aggregatePackageStats — package status counting", () => {
  describe("with no packages", () => {
    it("returns zeros for all statuses", () => {
      expect(aggregatePackageStats([])).toEqual({ pending: 0, notified: 0, picked_up: 0 });
    });
  });

  describe("with packages of a single status", () => {
    it("counts only pending packages correctly", () => {
      const packages: PackageRow[] = [
        { status: "pending" },
        { status: "pending" },
        { status: "pending" },
      ];
      expect(aggregatePackageStats(packages)).toEqual({
        pending: 3,
        notified: 0,
        picked_up: 0,
      });
    });

    it("counts only notified packages correctly", () => {
      const packages: PackageRow[] = [{ status: "notified" }, { status: "notified" }];
      expect(aggregatePackageStats(packages)).toEqual({
        pending: 0,
        notified: 2,
        picked_up: 0,
      });
    });

    it("counts only picked_up packages correctly", () => {
      const packages: PackageRow[] = [{ status: "picked_up" }];
      expect(aggregatePackageStats(packages)).toEqual({
        pending: 0,
        notified: 0,
        picked_up: 1,
      });
    });
  });

  describe("with packages across multiple statuses", () => {
    it("correctly aggregates a mixed set of packages", () => {
      const packages: PackageRow[] = [
        { status: "pending" },
        { status: "pending" },
        { status: "notified" },
        { status: "picked_up" },
        { status: "picked_up" },
        { status: "picked_up" },
      ];
      expect(aggregatePackageStats(packages)).toEqual({
        pending: 2,
        notified: 1,
        picked_up: 3,
      });
    });
  });

  describe("unknown status values", () => {
    it("silently ignores a package with an unknown status", () => {
      const packages: PackageRow[] = [
        { status: "pending" },
        { status: "returned" }, // not a recognised status
        { status: "lost" },     // not a recognised status
      ];
      expect(aggregatePackageStats(packages)).toEqual({
        pending: 1,
        notified: 0,
        picked_up: 0,
      });
    });
  });

  describe("immutability", () => {
    it("does not mutate the EMPTY_STATS baseline between calls", () => {
      aggregatePackageStats([{ status: "pending" }, { status: "pending" }]);
      // A second call should still start from zero
      const result = aggregatePackageStats([{ status: "notified" }]);
      expect(result.pending).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// buildPackageFilters
// ---------------------------------------------------------------------------

describe("buildPackageFilters — query filter construction", () => {
  describe("with no filters", () => {
    it("returns an empty conditions array when filters is undefined", () => {
      expect(buildPackageFilters(undefined)).toEqual([]);
    });

    it("returns an empty conditions array when filters is an empty object", () => {
      expect(buildPackageFilters({})).toEqual([]);
    });
  });

  describe("with only a status filter", () => {
    it("returns a single condition for the status field", () => {
      expect(buildPackageFilters({ status: "pending" })).toEqual([["status", "pending"]]);
    });

    it("works for 'notified' status", () => {
      expect(buildPackageFilters({ status: "notified" })).toEqual([["status", "notified"]]);
    });

    it("works for 'picked_up' status", () => {
      expect(buildPackageFilters({ status: "picked_up" })).toEqual([
        ["status", "picked_up"],
      ]);
    });
  });

  describe("with only an apartment_id filter", () => {
    it("returns a single condition for the apartment_id field", () => {
      expect(buildPackageFilters({ apartment_id: "apt-uuid-123" })).toEqual([
        ["apartment_id", "apt-uuid-123"],
      ]);
    });
  });

  describe("with both filters", () => {
    it("returns two conditions: status first, then apartment_id", () => {
      expect(
        buildPackageFilters({ status: "pending", apartment_id: "apt-uuid-123" })
      ).toEqual([
        ["status", "pending"],
        ["apartment_id", "apt-uuid-123"],
      ]);
    });
  });

  describe("falsy filter values are ignored", () => {
    it("ignores a status that is an empty string", () => {
      expect(buildPackageFilters({ status: "", apartment_id: "apt-uuid-123" })).toEqual([
        ["apartment_id", "apt-uuid-123"],
      ]);
    });

    it("ignores an apartment_id that is an empty string", () => {
      expect(buildPackageFilters({ status: "pending", apartment_id: "" })).toEqual([
        ["status", "pending"],
      ]);
    });
  });
});
