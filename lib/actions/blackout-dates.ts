"use server";

import { revalidatePath } from "next/cache";
import { getAdminProfile } from "@/lib/actions/helpers";

export async function getBlackouts(spaceId: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
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
    .from("blackout_dates")
    .select("*")
    .eq("space_id", spaceId)
    .order("date");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function normalizeTime(t: string): string {
  return t.length === 5 ? `${t}:00` : t;
}

export async function addBlackout(
  spaceId: string,
  date: string,
  reason?: string,
  startTime?: string | null,
  endTime?: string | null,
) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found in your building" };

  let start: string | null = null;
  let end: string | null = null;
  if (startTime && endTime) {
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return { error: "Invalid time format" };
    }
    start = normalizeTime(startTime);
    end = normalizeTime(endTime);
    if (end <= start) return { error: "End time must be after start time" };
  } else if (startTime || endTime) {
    return { error: "Both start and end time are required for partial-day blackout" };
  }

  const { error } = await supabase
    .from("blackout_dates")
    .insert({
      space_id: spaceId,
      date,
      reason: reason || null,
      start_time: start,
      end_time: end,
    });

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}

export async function removeBlackout(id: string, spaceId: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  // Verify the space belongs to the admin's building
  const { data: space } = await supabase
    .from("public_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("building_id", profile.building_id)
    .single();
  if (!space) return { error: "Space not found in your building" };

  const { error } = await supabase
    .from("blackout_dates")
    .delete()
    .eq("id", id)
    .eq("space_id", spaceId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}
