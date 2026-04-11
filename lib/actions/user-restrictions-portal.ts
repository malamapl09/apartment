"use server";

import { getAuthProfile } from "@/lib/actions/helpers";

export async function getMyActiveRestrictions() {
  const { error, supabase, user } = await getAuthProfile();
  if (error || !user) return { error: error ?? "Unauthorized", data: [] };

  const nowIso = new Date().toISOString();

  const { data, error: queryError } = await supabase
    .from("user_restrictions")
    .select("*, public_spaces(id, name)")
    .eq("profile_id", user.id)
    .is("revoked_at", null)
    .lte("starts_at", nowIso)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  if (queryError) return { error: queryError.message, data: [] };
  return { data: data || [] };
}
