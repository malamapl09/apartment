"use server";

import { revalidatePath } from "next/cache";
import { getAdminProfileForModule, getAuthProfileForModule } from "@/lib/actions/helpers";
import { fireAckNotificationsForDocument } from "@/lib/actions/document-acknowledgments";
import { z } from "zod";

const uploadDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.enum(["rules", "minutes", "contracts", "notices", "forms"]),
  target: z.enum(["all", "owners", "residents"]).default("all"),
  file_url: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  requires_acknowledgment: z.coerce.boolean().default(false),
});

export async function uploadDocument(formData: FormData) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("documents");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const fileSizeRaw = formData.get("file_size");
  const result = uploadDocumentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    category: formData.get("category"),
    target: formData.get("target") || "all",
    file_url: formData.get("file_url"),
    file_name: formData.get("file_name"),
    file_size: fileSizeRaw ? Number(fileSizeRaw) : null,
    mime_type: formData.get("mime_type") || null,
    requires_acknowledgment: formData.get("requires_acknowledgment") === "true",
  });

  if (!result.success) return { error: "Validation failed" };

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      ...result.data,
      building_id: profile.building_id,
      uploaded_by: user.id,
      version: 1,
      is_active: true,
    })
    .select("id, title")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Insert failed" };

  // Fire notifications (fire-and-forget) when the document requires
  // acknowledgment. audience RPC filters to active owners/residents matching
  // the document's target.
  if (result.data.requires_acknowledgment) {
    fireAckNotificationsForDocument(
      supabase,
      inserted.id,
      inserted.title,
      profile.building_id,
    ).catch((err) => {
      console.error("[documents] ack notifications failed", err);
    });
  }

  revalidatePath("/admin/documents");
  return { success: true };
}

export async function getDocuments(category?: string) {
  const { error: authError, supabase, user, profile } = await getAuthProfileForModule("documents");

  if (authError || !user || !profile) return { error: authError ?? "Unauthorized", data: [] };

  let query = supabase
    .from("documents")
    .select("*, profiles (id, full_name)")
    .eq("building_id", profile.building_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query.limit(500);

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getDocument(id: string) {
  const { error: authError, supabase, user } = await getAuthProfileForModule("documents");
  if (authError || !user) return { error: authError ?? "Unauthorized", data: null };

  const { data, error } = await supabase
    .from("documents")
    .select("*, profiles (id, full_name)")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) return { error: error.message, data: null };
  return { data };
}

export async function deleteDocument(id: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("documents");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase
    .from("documents")
    .update({ is_active: false })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return { success: true };
}

export async function uploadNewVersion(documentId: string, formData: FormData) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("documents");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const { data: existing, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("building_id", profile.building_id)
    .eq("is_active", true)
    .single();

  if (fetchError || !existing) return { error: "Document not found" };

  const fileSizeRaw = formData.get("file_size");
  // If the admin left the requires_acknowledgment field unset, inherit from
  // the previous version so new versions of "requires ack" documents keep
  // requiring it.
  const requiresAckRaw = formData.get("requires_acknowledgment");
  const requiresAck =
    requiresAckRaw === null
      ? (existing.requires_acknowledgment ?? false)
      : requiresAckRaw === "true";

  const result = uploadDocumentSchema.safeParse({
    title: formData.get("title") || existing.title,
    description: formData.get("description") || existing.description,
    category: formData.get("category") || existing.category,
    target: formData.get("target") || existing.target,
    file_url: formData.get("file_url"),
    file_name: formData.get("file_name"),
    file_size: fileSizeRaw ? Number(fileSizeRaw) : null,
    mime_type: formData.get("mime_type") || null,
    requires_acknowledgment: requiresAck,
  });

  if (!result.success) return { error: "Validation failed" };

  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      ...result.data,
      building_id: profile.building_id,
      uploaded_by: user.id,
      version: (existing.version ?? 1) + 1,
      previous_version_id: documentId,
      is_active: true,
    })
    .select("id, title")
    .single();

  if (error || !inserted) return { error: error?.message ?? "Insert failed" };

  // Deactivate the previous version so `getDocuments()` (which filters
  // is_active = true) returns only the new row. If this fails the new
  // version is still usable — log and continue; a retry would re-fire
  // notifications, which is worse than two momentarily-active rows.
  const { error: deactivateError } = await supabase
    .from("documents")
    .update({ is_active: false })
    .eq("id", documentId)
    .eq("building_id", profile.building_id);
  if (deactivateError) {
    console.error(
      "[documents] failed to deactivate previous version",
      documentId,
      deactivateError,
    );
  }

  // A new version resets acknowledgments — previous-version acks don't carry
  // over since it's a new document row.
  if (result.data.requires_acknowledgment) {
    fireAckNotificationsForDocument(
      supabase,
      inserted.id,
      inserted.title,
      profile.building_id,
    ).catch((err) => {
      console.error("[documents] ack notifications failed", err);
    });
  }

  revalidatePath("/admin/documents");
  return { success: true };
}
