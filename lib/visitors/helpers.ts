import type { VisitorStatus } from "@/types";

/**
 * True when the next check-in would be the first arrival of any member of
 * this visitor party. Used to decide whether to fire a notification to the
 * resident — we only notify on first arrival, not on every companion that
 * trickles in afterward.
 */
export function isFirstArrival(
  parentStatus: VisitorStatus,
  parentCheckedInAt: string | null,
  companions: { checked_in_at: string | null }[],
): boolean {
  if (parentStatus !== "expected") return false;
  if (parentCheckedInAt !== null) return false;
  return companions.every((c) => c.checked_in_at === null);
}

/**
 * Returns the display label for a visitor party in list views.
 *   ("Maria Lopez", 0) → "Maria Lopez"
 *   ("Maria Lopez", 3) → "Maria Lopez +3"
 */
export function formatGroupLabel(
  primaryName: string,
  companionCount: number,
): string {
  if (!Number.isFinite(companionCount) || companionCount <= 0) {
    return primaryName;
  }
  return `${primaryName} +${companionCount}`;
}
