"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const spaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  hourly_rate: z.coerce.number().nonnegative().default(0),
  deposit_amount: z.coerce.number().nonnegative().default(0),
  requires_approval: z.boolean().default(false),
  min_advance_hours: z.coerce.number().int().nonnegative().default(24),
  max_advance_days: z.coerce.number().int().positive().default(30),
  max_duration_hours: z.coerce.number().int().positive().default(8),
  max_monthly_per_owner: z.coerce.number().int().positive().default(4),
  gap_minutes: z.coerce.number().int().nonnegative().default(60),
  quiet_hours_start: z.string().optional().nullable(),
  quiet_hours_end: z.string().optional().nullable(),
  cancellation_hours: z.coerce.number().int().nonnegative().default(24),
});

export async function getSpaces() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles").select("building_id").eq("id", user.id).single();
  if (!profile) return { error: "Profile not found", data: [] };

  const { data, error } = await supabase
    .from("public_spaces")
    .select("*")
    .eq("building_id", profile.building_id)
    .order("name");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getSpace(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_spaces")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createSpace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles").select("building_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const result = spaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity: formData.get("capacity") || null,
    hourly_rate: formData.get("hourly_rate") || 0,
    deposit_amount: formData.get("deposit_amount") || 0,
    requires_approval: formData.get("requires_approval") === "true",
    min_advance_hours: formData.get("min_advance_hours") || 24,
    max_advance_days: formData.get("max_advance_days") || 30,
    max_duration_hours: formData.get("max_duration_hours") || 8,
    max_monthly_per_owner: formData.get("max_monthly_per_owner") || 4,
    gap_minutes: formData.get("gap_minutes") || 60,
    quiet_hours_start: formData.get("quiet_hours_start") || null,
    quiet_hours_end: formData.get("quiet_hours_end") || null,
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
  const supabase = await createClient();

  const result = spaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    capacity: formData.get("capacity") || null,
    hourly_rate: formData.get("hourly_rate") || 0,
    deposit_amount: formData.get("deposit_amount") || 0,
    requires_approval: formData.get("requires_approval") === "true",
    min_advance_hours: formData.get("min_advance_hours") || 24,
    max_advance_days: formData.get("max_advance_days") || 30,
    max_duration_hours: formData.get("max_duration_hours") || 8,
    max_monthly_per_owner: formData.get("max_monthly_per_owner") || 4,
    gap_minutes: formData.get("gap_minutes") || 60,
    quiet_hours_start: formData.get("quiet_hours_start") || null,
    quiet_hours_end: formData.get("quiet_hours_end") || null,
    cancellation_hours: formData.get("cancellation_hours") || 24,
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("public_spaces")
    .update(result.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/spaces");
  revalidatePath(`/admin/spaces/${id}`);
  return { success: true };
}

export async function toggleSpaceActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("public_spaces")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/spaces");
  return { success: true };
}

export async function updateSpacePhotos(id: string, photos: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("public_spaces")
    .update({ photos })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/spaces/${id}`);
  return { success: true };
}
