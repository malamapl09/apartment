"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ALL_MODULES, type Building, type Profile } from "@/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Auth helper ---

async function getSuperAdminProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return { error: "Unauthorized" as const, supabase, profile: null };
  }

  return { error: null, supabase, profile };
}

// --- Buildings ---

export async function getAllBuildings() {
  const { error } = await getSuperAdminProfile();
  if (error) return { error };

  const adminClient = createAdminClient();

  const { data: buildings, error: buildingsError } = await adminClient
    .from("buildings")
    .select("*")
    .order("created_at", { ascending: false });

  if (buildingsError || !buildings) {
    return { error: "Failed to fetch buildings" };
  }

  const buildingIds = buildings.map((b: Building) => b.id);

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("building_id, role")
    .in("building_id", buildingIds);

  const countMap = new Map<string, { user_count: number; admin_count: number }>();

  for (const p of profiles ?? []) {
    if (!p.building_id) continue;
    const entry = countMap.get(p.building_id) ?? { user_count: 0, admin_count: 0 };
    entry.user_count++;
    if (p.role === "admin" || p.role === "super_admin") {
      entry.admin_count++;
    }
    countMap.set(p.building_id, entry);
  }

  const buildingsWithStats = buildings.map((b: Building) => ({
    ...b,
    user_count: countMap.get(b.id)?.user_count ?? 0,
    admin_count: countMap.get(b.id)?.admin_count ?? 0,
  }));

  return { data: buildingsWithStats };
}

// --- Create building with admin ---

const createBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().default(""),
  total_units: z.coerce.number().int().min(1).max(9999),
  timezone: z.string().min(1),
  admin_email: z.string().email(),
  admin_name: z.string().min(2).max(200),
});

export async function createBuildingWithAdmin(formData: FormData) {
  const { error } = await getSuperAdminProfile();
  if (error) return { error };

  const raw = Object.fromEntries(formData.entries());
  const parsed = createBuildingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { name, address, total_units, timezone, admin_email, admin_name } = parsed.data;
  const adminClient = createAdminClient();

  // Step 1: Create building
  const { data: building, error: buildingError } = await adminClient
    .from("buildings")
    .insert({
      name,
      address: address || null,
      total_units,
      timezone,
    })
    .select("id")
    .single();

  if (buildingError || !building) {
    return { error: "Failed to create building" };
  }

  // Step 2: Invite admin user
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { data: newUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(admin_email, {
    data: {
      full_name: admin_name,
      building_id: building.id,
    },
    redirectTo: `${appUrl}/set-password`,
  });

  if (inviteError || !newUser.user) {
    // Cleanup: delete building
    await adminClient.from("buildings").delete().eq("id", building.id);
    return { error: inviteError?.message ?? "Failed to invite admin" };
  }

  // Step 3: Create profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .insert({
      id: newUser.user.id,
      building_id: building.id,
      role: "admin",
      full_name: admin_name,
      email: admin_email,
    });

  if (profileError) {
    // Cleanup: delete user and building
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    await adminClient.from("buildings").delete().eq("id", building.id);
    return { error: profileError.message };
  }

  // Step 4: Create email preferences (non-critical)
  const { error: emailPrefError } = await adminClient.from("email_preferences").insert({ user_id: newUser.user.id });
  if (emailPrefError) {
    console.warn("Failed to create email preferences for user:", newUser.user.id, emailPrefError.message);
  }

  revalidatePath("/super-admin");

  return { success: true, buildingId: building.id };
}

// --- Building detail ---

export async function getBuildingDetail(buildingId: string) {
  if (!UUID_REGEX.test(buildingId)) return { error: "Invalid building ID" };

  const { error } = await getSuperAdminProfile();
  if (error) return { error };

  const adminClient = createAdminClient();

  const { data: building, error: buildingError } = await adminClient
    .from("buildings")
    .select("*")
    .eq("id", buildingId)
    .single();

  if (buildingError || !building) {
    return { error: "Building not found" };
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("building_id", buildingId)
    .order("created_at", { ascending: true });

  if (profilesError) {
    return { error: "Failed to fetch profiles" };
  }

  return { data: { building: building as Building, profiles: (profiles ?? []) as Profile[] } };
}

// --- Update building ---

const updateBuildingSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().default(""),
  total_units: z.coerce.number().int().min(1).max(9999),
  timezone: z.string().min(1),
  enabled_modules: z.array(z.enum(ALL_MODULES)).default([]),
});

export async function updateBuilding(buildingId: string, formData: FormData) {
  if (!UUID_REGEX.test(buildingId)) return { error: "Invalid building ID" };

  const { error } = await getSuperAdminProfile();
  if (error) return { error };

  // FormData.entries() collapses repeated keys; pull modules separately.
  const enabled_modules = formData.getAll("enabled_modules").map(String);
  const raw = {
    ...Object.fromEntries(formData.entries()),
    enabled_modules,
  };
  const parsed = updateBuildingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { name, address, total_units, timezone, enabled_modules: modules } =
    parsed.data;
  const adminClient = createAdminClient();

  const { error: updateError } = await adminClient
    .from("buildings")
    .update({
      name,
      address: address || null,
      total_units,
      timezone,
      enabled_modules: modules,
    })
    .eq("id", buildingId);

  if (updateError) {
    return { error: "Failed to update building" };
  }

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/buildings/${buildingId}`);

  return { success: true };
}
