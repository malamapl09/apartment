"use server";

import { createClient } from "@/lib/supabase/server";

// For any authenticated user — returns user, profile with building_id and role
export async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Unauthorized" as const, supabase, user: null, profile: null };
  return { error: null, supabase, user, profile };
}

// For admin-only actions
export async function getAdminProfile() {
  const result = await getAuthProfile();
  if (result.error || !result.profile) return result;

  if (!["admin", "super_admin"].includes(result.profile.role)) {
    return { error: "Unauthorized" as const, supabase: result.supabase, user: null, profile: null };
  }
  return result;
}
