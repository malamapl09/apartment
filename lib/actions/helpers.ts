"use server";

import { createClient } from "@/lib/supabase/server";
import type { ModuleKey } from "@/types";

export type AuthProfile = {
  id: string;
  building_id: string;
  role: string;
  enabled_modules: ModuleKey[];
};

// For any authenticated user — returns user, profile (with building_id, role,
// and the building's enabled_modules array)
export async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  const { data: row } = await supabase
    .from("profiles")
    .select("id, building_id, role, buildings!building_id(enabled_modules)")
    .eq("id", user.id)
    .single();

  if (!row) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  // PostgREST returns the joined relation either as an object or array of one
  // depending on the relationship cardinality; flatten defensively.
  const buildingsRel = (row as { buildings?: unknown }).buildings;
  const buildingRow = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const enabledModules = (buildingRow as { enabled_modules?: ModuleKey[] } | null)
    ?.enabled_modules ?? [];

  const profile: AuthProfile = {
    id: row.id,
    building_id: row.building_id,
    role: row.role,
    enabled_modules: enabledModules,
  };

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

// For any-authenticated-user actions guarded by a module toggle.
// Returns the same shape as getAuthProfile but errors out with a stable
// "Module not enabled" sentinel if the user's building has the module off.
export async function getAuthProfileForModule(module: ModuleKey) {
  const result = await getAuthProfile();
  if (result.error || !result.profile) return result;
  if (!result.profile.enabled_modules.includes(module)) {
    return {
      error: "Module not enabled" as const,
      supabase: result.supabase,
      user: null,
      profile: null,
    };
  }
  return result;
}

// For admin-only actions guarded by a module toggle.
export async function getAdminProfileForModule(module: ModuleKey) {
  const result = await getAdminProfile();
  if (result.error || !result.profile) return result;
  if (!result.profile.enabled_modules.includes(module)) {
    return {
      error: "Module not enabled" as const,
      supabase: result.supabase,
      user: null,
      profile: null,
    };
  }
  return result;
}
