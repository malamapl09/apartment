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
