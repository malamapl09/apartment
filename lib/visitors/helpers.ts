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

/**
 * Pure JS mirror of the SQL is_visitor_blacklisted() RPC. Used for client-side
 * or test-only matching; the DB-side RPC is authoritative at registration
 * time. Matches on case-insensitive name OR exact id_number OR exact phone.
 */
export interface BlacklistCandidate {
  name: string;
  id_number?: string | null;
  phone?: string | null;
}
export interface BlacklistEntry {
  name: string;
  id_number: string | null;
  phone: string | null;
}

export function matchesBlacklist(
  candidate: BlacklistCandidate,
  entries: BlacklistEntry[],
): boolean {
  const candidateName = (candidate.name ?? "").trim().toLowerCase();
  const candidateId = (candidate.id_number ?? "").trim();
  const candidatePhone = (candidate.phone ?? "").trim();

  for (const entry of entries) {
    if (
      candidateId &&
      entry.id_number &&
      entry.id_number.trim() === candidateId
    ) {
      return true;
    }
    if (
      candidatePhone &&
      entry.phone &&
      entry.phone.trim() === candidatePhone
    ) {
      return true;
    }
    if (candidateName && entry.name.trim().toLowerCase() === candidateName) {
      return true;
    }
  }
  return false;
}

/**
 * Cron filter predicate mirror: a visitor is "expired" when it's still
 * marked `expected` but its valid window has passed.
 */
export function isVisitorExpired(
  visitor: { status: string; valid_until: string },
  now: Date = new Date(),
): boolean {
  if (visitor.status !== "expected") return false;
  return new Date(visitor.valid_until) < now;
}
