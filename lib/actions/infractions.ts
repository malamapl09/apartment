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

  // Atomic: infraction + optional linked restriction committed together.
  // Without the DB-side wrapper, a partial failure could leave an infraction
  // without its intended restriction.
  const { data: infractionId, error } = await supabase.rpc(
    "create_infraction_with_optional_restriction",
    {
      p_building_id: profile.building_id,
      p_profile_id: parsed.data.profile_id,
      p_space_id: parsed.data.space_id || null,
      p_occurred_at: parsed.data.occurred_at,
      p_severity: parsed.data.severity,
      p_description: parsed.data.description,
      p_created_by: user.id,
      p_also_restrict: parsed.data.also_restrict ?? false,
      p_restriction_reason: parsed.data.restriction_reason ?? null,
      p_restriction_ends_at: parsed.data.restriction_ends_at ?? null,
    },
  );

  if (error || !infractionId) {
    return { error: error?.message ?? "Failed to create infraction" };
  }

  await logAuditEvent({
    action: "infraction.create",
    tableName: "infractions",
    recordId: infractionId as string,
    newData: { severity: parsed.data.severity, profile_id: parsed.data.profile_id },
  });

  revalidatePath(`/admin/owners/${parsed.data.profile_id}`);
  return { success: true, data: { id: infractionId as string } };
}

export async function deleteInfraction(id: string) {
  const { error: authError, supabase, profile, user } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(id)) return { error: "Invalid id" };

  const { data: infraction } = await supabase
    .from("infractions")
    .select("id, profile_id, building_id")
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();
  if (!infraction) return { error: "Not found" };

  // Revoke any still-active restrictions linked to this infraction so an
  // admin deleting an erroneous infraction isn't left with an orphan
  // restriction that still blocks the user.
  const { error: revokeError } = await supabase
    .from("user_restrictions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
    })
    .eq("infraction_id", id)
    .is("revoked_at", null);
  if (revokeError) return { error: revokeError.message };

  const { error } = await supabase.from("infractions").delete().eq("id", id);
  if (error) return { error: error.message };

  await logAuditEvent({
    action: "infraction.delete",
    tableName: "infractions",
    recordId: id,
  });

  if (infraction.profile_id) {
    revalidatePath(`/admin/owners/${infraction.profile_id}`);
  }
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
