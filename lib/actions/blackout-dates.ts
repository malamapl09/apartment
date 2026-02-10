"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getBlackouts(spaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blackout_dates")
    .select("*")
    .eq("space_id", spaceId)
    .order("date");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function addBlackout(spaceId: string, date: string, reason?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blackout_dates")
    .insert({ space_id: spaceId, date, reason: reason || null });

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}

export async function removeBlackout(id: string, spaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("blackout_dates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true };
}
