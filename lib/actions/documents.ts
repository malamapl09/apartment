"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
});

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", user: null, profile: null };
  }

  return { error: null, user, profile };
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();
  const { error: authError, user, profile } = await getAdminProfile(supabase);
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
  });

  if (!result.success) return { error: "Validation failed" };

  const { error } = await supabase.from("documents").insert({
    ...result.data,
    building_id: profile.building_id,
    uploaded_by: user.id,
    version: 1,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return { success: true };
}

export async function getDocuments(category?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found", data: [] };

  let query = supabase
    .from("documents")
    .select("*, profiles (id, full_name)")
    .eq("building_id", profile.building_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getDocument(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: null };

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
  const supabase = await createClient();
  const { error: authError, profile } = await getAdminProfile(supabase);
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
  const supabase = await createClient();
  const { error: authError, user, profile } = await getAdminProfile(supabase);
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
  const result = uploadDocumentSchema.safeParse({
    title: formData.get("title") || existing.title,
    description: formData.get("description") || existing.description,
    category: formData.get("category") || existing.category,
    target: formData.get("target") || existing.target,
    file_url: formData.get("file_url"),
    file_name: formData.get("file_name"),
    file_size: fileSizeRaw ? Number(fileSizeRaw) : null,
    mime_type: formData.get("mime_type") || null,
  });

  if (!result.success) return { error: "Validation failed" };

  const { error } = await supabase.from("documents").insert({
    ...result.data,
    building_id: profile.building_id,
    uploaded_by: user.id,
    version: (existing.version ?? 1) + 1,
    previous_version_id: documentId,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/documents");
  return { success: true };
}
