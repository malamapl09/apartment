"use server";

import { revalidatePath } from "next/cache";
import { getAdminProfileForModule } from "@/lib/actions/helpers";

export async function getSchedule(spaceId: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  // Verify the space belongs to the admin's building
  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found in your building", data: [] };

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
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  // Verify the space belongs to the admin's building
  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found in your building" };

  // Delete existing schedules
  const { error: deleteError } = await supabase
    .from("availability_schedules")
    .delete()
    .eq("space_id", spaceId);

  if (deleteError) return { error: deleteError.message };

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
