"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminProfile } from "@/lib/actions/helpers";
import { logAuditEvent } from "@/lib/audit/log";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const infractionSchema = z.object({
  profile_id: z.string().regex(UUID_RE),
  space_id: z.string().regex(UUID_RE).optional().nullable(),
  occurred_at: z.string().datetime(),
  severity: z.enum(["minor", "major", "severe"]).default("minor"),
  description: z.string().min(1).max(2000),
  also_restrict: z.boolean().optional(),
  restriction_reason: z.string().max(500).optional(),
  restriction_ends_at: z.string().datetime().optional().nullable(),
});

export async function createInfraction(formData: FormData) {
  const { error: authError, supabase, profile, user } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  const spaceIdRaw = formData.get("space_id");
  const parsed = infractionSchema.safeParse({
    profile_id: formData.get("profile_id"),
    space_id: spaceIdRaw && spaceIdRaw !== "" ? spaceIdRaw : null,
    occurred_at: formData.get("occurred_at"),
    severity: formData.get("severity") || "minor",
    description: formData.get("description"),
    also_restrict: formData.get("also_restrict") === "true",
    restriction_reason: formData.get("restriction_reason") || undefined,
    restriction_ends_at: formData.get("restriction_ends_at") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, building_id")
    .eq("id", parsed.data.profile_id)
    .eq("building_id", profile.building_id)
    .single();
  if (!targetProfile) return { error: "Profile not found in your building" };

  const { data: infraction, error } = await supabase
    .from("infractions")
    .insert({
      building_id: profile.building_id,
      profile_id: parsed.data.profile_id,
      space_id: parsed.data.space_id || null,
      occurred_at: parsed.data.occurred_at,
      severity: parsed.data.severity,
      description: parsed.data.description,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !infraction) return { error: error?.message ?? "Failed to create infraction" };

  await logAuditEvent({
    action: "infraction.create",
    tableName: "infractions",
    recordId: infraction.id,
    newData: { severity: parsed.data.severity, profile_id: parsed.data.profile_id },
  });

  if (parsed.data.also_restrict) {
    const { error: restrictionError } = await supabase
      .from("user_restrictions")
      .insert({
        building_id: profile.building_id,
        profile_id: parsed.data.profile_id,
        space_id: parsed.data.space_id || null,
        infraction_id: infraction.id,
        reason: parsed.data.restriction_reason || parsed.data.description,
        ends_at: parsed.data.restriction_ends_at || null,
        created_by: user.id,
      });
    if (restrictionError) return { error: restrictionError.message };
  }

  revalidatePath(`/admin/owners/${parsed.data.profile_id}`);
  return { success: true, data: infraction };
}

export async function deleteInfraction(id: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(id)) return { error: "Invalid id" };

  const { data: infraction } = await supabase
    .from("infractions")
    .select("id, profile_id, building_id")
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();
  if (!infraction) return { error: "Not found" };

  const { error } = await supabase.from("infractions").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAuditEvent({
    action: "infraction.delete",
    tableName: "infractions",
    recordId: id,
  });

  revalidatePath(`/admin/owners/${infraction.profile_id}`);
  return { success: true };
}

export async function getInfractionsForProfile(profileId: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };
  if (!UUID_RE.test(profileId)) return { error: "Invalid id", data: [] };

  const { data, error } = await supabase
    .from("infractions")
    .select("*, public_spaces(id, name)")
    .eq("profile_id", profileId)
    .eq("building_id", profile.building_id)
    .order("occurred_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}
