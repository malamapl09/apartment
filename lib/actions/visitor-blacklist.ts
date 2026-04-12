"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminProfileForModule } from "@/lib/actions/helpers";
import { logAuditEvent } from "@/lib/audit/log";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const blacklistSchema = z.object({
  name: z.string().min(1).max(200),
  id_number: z.string().max(50).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  reason: z.string().min(1).max(1000),
});

export async function getBlacklist() {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("visitors");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const { data, error } = await supabase
    .from("visitor_blacklist")
    .select("*, profiles!created_by(id, full_name)")
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function addBlacklistEntry(formData: FormData) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("visitors");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const parsed = blacklistSchema.safeParse({
    name: formData.get("name"),
    id_number: formData.get("id_number") || null,
    phone: formData.get("phone") || null,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { data, error } = await supabase
    .from("visitor_blacklist")
    .insert({
      building_id: profile.building_id,
      name: parsed.data.name.trim(),
      id_number: parsed.data.id_number?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      reason: parsed.data.reason.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "visitor_blacklist.create",
    tableName: "visitor_blacklist",
    recordId: data.id,
    newData: { name: parsed.data.name, reason: parsed.data.reason },
  });

  revalidatePath("/admin/visitors/blacklist");
  return { success: true, data };
}

export async function removeBlacklistEntry(id: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("visitors");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };
  if (!UUID_RE.test(id)) return { error: "Invalid id" };

  const { error } = await supabase
    .from("visitor_blacklist")
    .delete()
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: "visitor_blacklist.delete",
    tableName: "visitor_blacklist",
    recordId: id,
  });

  revalidatePath("/admin/visitors/blacklist");
  return { success: true };
}
