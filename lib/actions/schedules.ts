"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getSchedule(spaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("space_id", spaceId)
    .order("day_of_week");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function updateSchedule(
  spaceId: string,
  schedules: Array<{ day_of_week: number; start_time: string; end_time: string }>
) {
  const supabase = await createClient();

  // Delete existing schedules
  await supabase
    .from("availability_schedules")
    .delete()
    .eq("space_id", spaceId);

  // Insert new schedules
  if (schedules.length > 0) {
    const { error } = await supabase
      .from("availability_schedules")
      .insert(schedules.map((s) => ({ ...s, space_id: spaceId })));

    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}
