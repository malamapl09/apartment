"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAdminProfileForModule, getAuthProfileForModule } from "@/lib/actions/helpers";

const optionalPositive = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().positive().nullable(),
);

const spaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  hourly_rate: z.coerce.number().nonnegative().default(0),
  deposit_amount: z.coerce.number().nonnegative().default(0),
  allow_reservations: z.boolean().default(true),
  min_advance_hours: z.coerce.number().int().nonnegative().default(24),
  max_advance_days: z.coerce.number().int().positive().default(30),
  max_duration_hours: z.coerce.number().int().positive().default(8),
  max_monthly_per_owner: z.coerce.number().int().positive().default(4),
  gap_minutes: z.coerce.number().int().nonnegative().default(60),
  max_hours_per_day_per_user: optionalPositive,
  max_hours_per_week_per_user: optionalPositive,
  max_hours_per_month_per_user: optionalPositive,
  cancellation_hours: z.coerce.number().int().nonnegative().default(24),
});

export async function getSpaces() {
  const { error: authError, supabase, profile } = await getAuthProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const { data, error } = await supabase
    .from("public_spaces")
    .select("*")
    .eq("building_id", profile.building_id)
    .order("name");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getSpace(id: string) {
  const { error: authError, supabase, profile } = await getAuthProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase
    .from("public_spaces")
    .select("*")
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createSpace(formData: FormData) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const result = spaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity: formData.get("capacity") || null,
    hourly_rate: formData.get("hourly_rate") || 0,
    deposit_amount: formData.get("deposit_amount") || 0,
    allow_reservations: formData.get("allow_reservations") === "true",
    min_advance_hours: formData.get("min_advance_hours") || 24,
    max_advance_days: formData.get("max_advance_days") || 30,
    max_duration_hours: formData.get("max_duration_hours") || 8,
    max_monthly_per_owner: formData.get("max_monthly_per_owner") || 4,
    gap_minutes: formData.get("gap_minutes") || 60,
    max_hours_per_day_per_user: formData.get("max_hours_per_day_per_user"),
    max_hours_per_week_per_user: formData.get("max_hours_per_week_per_user"),
    max_hours_per_month_per_user: formData.get("max_hours_per_month_per_user"),
    cancellation_hours: formData.get("cancellation_hours") || 24,
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { data, error } = await supabase
    .from("public_spaces")
    .insert({ ...result.data, building_id: profile.building_id })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/spaces");
  return { success: true, data };
}

export async function updateSpace(id: string, formData: FormData) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const result = spaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity: formData.get("capacity") || null,
    hourly_rate: formData.get("hourly_rate") || 0,
    deposit_amount: formData.get("deposit_amount") || 0,
    allow_reservations: formData.get("allow_reservations") === "true",
    min_advance_hours: formData.get("min_advance_hours") || 24,
    max_advance_days: formData.get("max_advance_days") || 30,
    max_duration_hours: formData.get("max_duration_hours") || 8,
    max_monthly_per_owner: formData.get("max_monthly_per_owner") || 4,
    gap_minutes: formData.get("gap_minutes") || 60,
    max_hours_per_day_per_user: formData.get("max_hours_per_day_per_user"),
    max_hours_per_week_per_user: formData.get("max_hours_per_week_per_user"),
    max_hours_per_month_per_user: formData.get("max_hours_per_month_per_user"),
    cancellation_hours: formData.get("cancellation_hours") || 24,
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("public_spaces")
    .update(result.data)
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/spaces");
  revalidatePath(`/admin/spaces/${id}`);
  return { success: true };
}

export async function toggleSpaceActive(id: string, isActive: boolean) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase
    .from("public_spaces")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/spaces");
  return { success: true };
}

export async function updateSpacePhotos(id: string, photos: string[]) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase
    .from("public_spaces")
    .update({ photos })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${id}`);
  return { success: true };
}
