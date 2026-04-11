"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminProfile } from "@/lib/actions/helpers";
import { logAuditEvent } from "@/lib/audit/log";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const restrictionSchema = z.object({
  profile_id: z.string().regex(UUID_RE),
  space_id: z.string().regex(UUID_RE).optional().nullable(),
  infraction_id: z.string().regex(UUID_RE).optional().nullable(),
  reason: z.string().min(1).max(500),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
});

export async function createRestriction(formData: FormData) {
  const { error: authError, supabase, profile, user } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  const spaceIdRaw = formData.get("space_id");
  const infractionIdRaw = formData.get("infraction_id");
  const endsAtRaw = formData.get("ends_at");

  const parsed = restrictionSchema.safeParse({
    profile_id: formData.get("profile_id"),
    space_id: spaceIdRaw && spaceIdRaw !== "" ? spaceIdRaw : null,
    infraction_id: infractionIdRaw && infractionIdRaw !== "" ? infractionIdRaw : null,
    reason: formData.get("reason"),
    starts_at: formData.get("starts_at"),
    ends_at: endsAtRaw && endsAtRaw !== "" ? endsAtRaw : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.profile_id)
    .eq("building_id", profile.building_id)
    .single();
  if (!targetProfile) return { error: "Profile not found in your building" };

  const { data, error } = await supabase
    .from("user_restrictions")
    .insert({
      building_id: profile.building_id,
      profile_id: parsed.data.profile_id,
      space_id: parsed.data.space_id || null,
      infraction_id: parsed.data.infraction_id || null,
      reason: parsed.data.reason,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "restriction.create",
    tableName: "user_restrictions",
    recordId: data.id,
    newData: {
      profile_id: parsed.data.profile_id,
      space_id: parsed.data.space_id,
      reason: parsed.data.reason,
    },
  });

  revalidatePath(`/admin/owners/${parsed.data.profile_id}`);
  return { success: true, data };
}

export async function revokeRestriction(id: string) {
  const { error: authError, supabase, profile, user } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(id)) return { error: "Invalid id" };

  const { data: existing } = await supabase
    .from("user_restrictions")
    .select("id, profile_id, building_id, revoked_at")
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();
  if (!existing) return { error: "Not found" };
  if (existing.revoked_at) return { error: "Already revoked" };

  const { error } = await supabase
    .from("user_restrictions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "restriction.revoke",
    tableName: "user_restrictions",
    recordId: id,
  });

  revalidatePath(`/admin/owners/${existing.profile_id}`);
  return { success: true };
}

export async function getRestrictionsForProfile(profileId: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };
  if (!UUID_RE.test(profileId)) return { error: "Invalid id", data: [] };

  const { data, error } = await supabase
    .from("user_restrictions")
    .select("*, public_spaces(id, name)")
    .eq("profile_id", profileId)
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}
