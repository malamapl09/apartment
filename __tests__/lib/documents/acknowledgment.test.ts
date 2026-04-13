import { describe, it, expect } from "vitest";
import { isInAudience, summarizePendingAcks } from "@/lib/documents/helpers";
import type { PendingAcknowledgment } from "@/types";

describe("isInAudience", () => {
  it("owner is in 'all' audience", () => {
    expect(isInAudience("owner", "all")).toBe(true);
  });

  it("resident is in 'all' audience", () => {
    expect(isInAudience("resident", "all")).toBe(true);
  });

  it("owner is in 'owners' audience", () => {
    expect(isInAudience("owner", "owners")).toBe(true);
  });

  it("resident is NOT in 'owners' audience", () => {
    expect(isInAudience("resident", "owners")).toBe(false);
  });

  it("resident is in 'residents' audience", () => {
    expect(isInAudience("resident", "residents")).toBe(true);
  });

  it("owner is NOT in 'residents' audience", () => {
    expect(isInAudience("owner", "residents")).toBe(false);
  });

  it("admin is never in audience", () => {
    expect(isInAudience("admin", "all")).toBe(false);
    expect(isInAudience("admin", "owners")).toBe(false);
    expect(isInAudience("admin", "residents")).toBe(false);
  });

  it("super_admin is never in audience", () => {
    expect(isInAudience("super_admin", "all")).toBe(false);
  });

  it("null/undefined target defaults to 'all'", () => {
    expect(isInAudience("owner", null)).toBe(true);
    expect(isInAudience("resident", undefined)).toBe(true);
  });

  it("null/undefined role is not in audience", () => {
    expect(isInAudience(null, "all")).toBe(false);
    expect(isInAudience(undefined, "all")).toBe(false);
  });

  it("unknown role is not in audience", () => {
    expect(isInAudience("guest", "all")).toBe(false);
    expect(isInAudience("", "all")).toBe(false);
  });

  it("unknown target is not in audience (fail-closed)", () => {
    // Target values the DB doesn't know about shouldn't grant access.
    expect(isInAudience("owner", "everyone")).toBe(false);
    expect(isInAudience("resident", "staff")).toBe(false);
  });

  // These cases mirror the WITH CHECK clause on the INSERT RLS policy:
  // the database additionally requires the document to be active and to
  // require acknowledgment. The helper only covers the role/target pair —
  // active/requires_ack/building_id are DB-enforced. Documented here so a
  // future regression that re-broadens the helper is caught.
  it("role/target pairing is the full responsibility of this helper", () => {
    expect(isInAudience("owner", "all")).toBe(true);
    expect(isInAudience("resident", "residents")).toBe(true);
    expect(isInAudience("admin", "residents")).toBe(false);
  });
});

describe("summarizePendingAcks", () => {
  const mk = (n: number): PendingAcknowledgment[] =>
    Array.from({ length: n }, (_, i) => ({
      document_id: `d${i}`,
      title: `Doc ${i}`,
      category: "rules",
    }));

  it("returns all titles when count <= max", () => {
    const r = summarizePendingAcks(mk(3), 3);
    expect(r.count).toBe(3);
    expect(r.titlesShown).toEqual(["Doc 0", "Doc 1", "Doc 2"]);
    expect(r.moreCount).toBe(0);
  });

  it("truncates with overflow when count > max", () => {
    const r = summarizePendingAcks(mk(5), 3);
    expect(r.count).toBe(5);
    expect(r.titlesShown).toEqual(["Doc 0", "Doc 1", "Doc 2"]);
    expect(r.moreCount).toBe(2);
  });

  it("handles empty list", () => {
    const r = summarizePendingAcks([], 3);
    expect(r.count).toBe(0);
    expect(r.titlesShown).toEqual([]);
    expect(r.moreCount).toBe(0);
  });

  it("treats maxTitles=0 as no titles, all overflow", () => {
    const r = summarizePendingAcks(mk(4), 0);
    expect(r.count).toBe(4);
    expect(r.titlesShown).toEqual([]);
    expect(r.moreCount).toBe(4);
  });

  it("treats negative maxTitles as 0 (no titles, all overflow)", () => {
    const r = summarizePendingAcks(mk(3), -1);
    expect(r.count).toBe(3);
    expect(r.titlesShown).toEqual([]);
    expect(r.moreCount).toBe(3);
  });

  it("floors non-integer maxTitles", () => {
    const r = summarizePendingAcks(mk(5), 2.9);
    expect(r.titlesShown).toEqual(["Doc 0", "Doc 1"]);
    expect(r.moreCount).toBe(3);
  });

  it("uses default maxTitles=3 when not passed", () => {
    const r = summarizePendingAcks(mk(5));
    expect(r.titlesShown).toHaveLength(3);
    expect(r.moreCount).toBe(2);
  });
});
