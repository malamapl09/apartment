"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  target: z.enum(["all", "owners", "residents"]).default("all"),
  expires_at: z.string().optional().nullable(),
});

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const result = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    target: formData.get("target") || "all",
    expires_at: formData.get("expires_at") || null,
  });

  if (!result.success) return { error: "Validation failed" };

  const { error } = await supabase.from("announcements").insert({
    ...result.data,
    building_id: profile.building_id,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  return { success: true };
}

export async function getAnnouncements() {
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

  const { data, error } = await supabase
    .from("announcements")
    .select("*, profiles (full_name)")
    .eq("building_id", profile.building_id)
    .order("published_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  return { success: true };
}
