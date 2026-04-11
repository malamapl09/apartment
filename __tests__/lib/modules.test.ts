import { describe, it, expect } from "vitest";
import { isModuleEnabled, requireModuleEnabled } from "@/lib/modules";

/**
 * Pure unit tests for the module-toggle helpers. The page-level
 * assertCurrentUserHasModule helper is not tested directly because it does a
 * Supabase query — its behaviour is exercised by Phase-12 manual smoke tests.
 */

describe("isModuleEnabled", () => {
  it("returns true when the module is in the array", () => {
    expect(isModuleEnabled(["visitors", "fees"], "visitors")).toBe(true);
  });

  it("returns false when the module is not in the array", () => {
    expect(isModuleEnabled(["fees"], "visitors")).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(isModuleEnabled([], "visitors")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isModuleEnabled(null, "visitors")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isModuleEnabled(undefined, "visitors")).toBe(false);
  });

  it("does not match a partial / similar string", () => {
    expect(isModuleEnabled(["visitor"], "visitors")).toBe(false);
  });
});

describe("requireModuleEnabled", () => {
  it("returns null when the module is enabled", () => {
    expect(requireModuleEnabled(["visitors"], "visitors")).toBeNull();
  });

  it("returns an error object when the module is disabled", () => {
    const result = requireModuleEnabled(["fees"], "visitors");
    expect(result).not.toBeNull();
    expect(result?.error).toBeTypeOf("string");
  });

  it("returns an error object when enabledModules is null", () => {
    const result = requireModuleEnabled(null, "visitors");
    expect(result).not.toBeNull();
    expect(result?.error).toContain("Module");
  });
});
