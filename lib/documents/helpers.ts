import type { PendingAcknowledgment } from "@/types";

/**
 * Is this user's role in the target audience for a document?
 *
 * Admins and super_admins are NEVER in the audience — they're the ones
 * requiring acknowledgment, not the ones acknowledging.
 * Inactive profiles should already be filtered upstream by the caller.
 */
export function isInAudience(
  userRole: string | null | undefined,
  documentTarget: string | null | undefined,
): boolean {
  if (userRole !== "owner" && userRole !== "resident") return false;
  if (!documentTarget || documentTarget === "all") return true;
  if (documentTarget === "owners") return userRole === "owner";
  if (documentTarget === "residents") return userRole === "resident";
  return false;
}

/**
 * Truncate a list of pending acknowledgments for banner display.
 * Returns how many to show + the overflow count.
 */
export function summarizePendingAcks(
  pending: PendingAcknowledgment[],
  maxTitles = 3,
): { count: number; titlesShown: string[]; moreCount: number } {
  const count = pending.length;
  const safeMax = Math.max(0, Math.floor(maxTitles));
  const titlesShown = pending.slice(0, safeMax).map((p) => p.title);
  const moreCount = Math.max(0, count - titlesShown.length);
  return { count, titlesShown, moreCount };
}
