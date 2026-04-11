"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ModuleKey } from "@/types";

export type AuthProfile = {
  id: string;
  building_id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  enabled_modules: ModuleKey[];
};

// Internal cached fetcher. React.cache dedupes identical calls within a
// single request-render pass, so the layout + page + any server action in the
// same request all share one round-trip.
const fetchAuthProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  const { data: row } = await supabase
    .from("profiles")
    .select(
      "id, building_id, role, full_name, avatar_url, buildings!building_id(enabled_modules)",
    )
    .eq("id", user.id)
    .single();

  if (!row) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  const buildingsRel = (row as { buildings?: unknown }).buildings;
  const buildingRow = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const enabledModules = (buildingRow as { enabled_modules?: ModuleKey[] } | null)
    ?.enabled_modules ?? [];

  const profile: AuthProfile = {
    id: row.id,
    building_id: row.building_id,
    role: row.role,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
    enabled_modules: enabledModules,
  };

  return { error: null, supabase, user, profile };
});

// For any authenticated user — returns user, profile (with building_id, role,
// and the building's enabled_modules array)
export async function getAuthProfile() {
  return fetchAuthProfile();
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
