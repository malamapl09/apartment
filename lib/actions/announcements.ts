"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { getAdminProfile } from "@/lib/actions/helpers";

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

  // Fire-and-forget: batch-send announcement emails to building members
  const { data: building } = await supabase
    .from("buildings")
    .select("name")
    .eq("id", profile.building_id)
    .single();

  let membersQuery = supabase
    .from("profiles")
    .select("id")
    .eq("building_id", profile.building_id)
    .eq("is_active", true)
    .neq("id", user.id);

  if (result.data.target === "owners") {
    membersQuery = membersQuery.in("role", ["owner"]);
  } else if (result.data.target === "residents") {
    membersQuery = membersQuery.in("role", ["resident"]);
  }

  const { data: members } = await membersQuery;

  if (members) {
    for (const member of members) {
      sendNotificationEmail({
        userId: member.id,
        type: "new_announcements",
        templateProps: {
          announcementTitle: result.data.title,
          announcementBody: result.data.body,
          buildingName: building?.name ?? "",
        },
      }).catch(() => {});
    }
  }

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
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function deleteAnnouncement(id: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("building_id", profile.building_id);
  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  return { success: true };
}
