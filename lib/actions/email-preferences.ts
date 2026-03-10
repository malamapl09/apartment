"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EmailPreferences } from "@/types";

export async function getEmailPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: null };

  // Try to get existing preferences
  let { data: prefs } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Create defaults if none exist
  if (!prefs) {
    const { data: newPrefs, error } = await supabase
      .from("email_preferences")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) return { error: error.message, data: null };
    prefs = newPrefs;
  }

  return { data: prefs as EmailPreferences };
}

export async function updateEmailPreferences(
  prefs: Partial<EmailPreferences>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Pick only updatable boolean fields
  const updateData: Record<string, unknown> = {};
  if (prefs.new_charges !== undefined) updateData.new_charges = prefs.new_charges;
  if (prefs.maintenance_updates !== undefined)
    updateData.maintenance_updates = prefs.maintenance_updates;
  if (prefs.visitor_checkins !== undefined)
    updateData.visitor_checkins = prefs.visitor_checkins;
  if (prefs.new_announcements !== undefined)
    updateData.new_announcements = prefs.new_announcements;
  if (prefs.overdue_reminders !== undefined)
    updateData.overdue_reminders = prefs.overdue_reminders;

  const { error } = await supabase
    .from("email_preferences")
    .update(updateData)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/portal/profile");
  return { success: true };
}
