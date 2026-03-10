"use server";

import { getAdminProfile } from "@/lib/actions/helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getBuildingSettings() {
  const { error, supabase, profile } = await getAdminProfile();
  if (error || !profile) return { error: "Unauthorized" };

  const { data, error: dbError } = await supabase
    .from("buildings")
    .select(
      "id, name, address, total_units, bank_account_info, payment_deadline_hours, timezone"
    )
    .eq("id", profile.building_id)
    .single();

  if (dbError) return { error: "Failed to load settings" };
  return { data };
}

const settingsSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional().default(""),
  total_units: z.coerce.number().int().min(1).max(9999),
  timezone: z.string().min(1),
  payment_deadline_hours: z.coerce.number().int().min(1).max(720),
  bank_name: z.string().max(200).optional().default(""),
  account_number: z.string().max(100).optional().default(""),
  account_type: z.string().max(50).optional().default(""),
  holder_name: z.string().max(200).optional().default(""),
});

export async function updateBuildingSettings(formData: FormData) {
  const { error, supabase, profile } = await getAdminProfile();
  if (error || !profile) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = settingsSchema.safeParse(raw);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Validation failed" };
  }

  const {
    name,
    address,
    total_units,
    timezone,
    payment_deadline_hours,
    bank_name,
    account_number,
    account_type,
    holder_name,
  } = parsed.data;

  const hasBankInfo =
    bank_name || account_number || account_type || holder_name;

  const bank_account_info = hasBankInfo
    ? { bank_name, account_number, account_type, holder_name }
    : null;

  const { error: dbError } = await supabase
    .from("buildings")
    .update({
      name,
      address,
      total_units,
      timezone,
      payment_deadline_hours,
      bank_account_info,
    })
    .eq("id", profile.building_id);

  if (dbError) return { error: "Failed to update settings" };

  revalidatePath("/[locale]/admin/settings", "page");

  return { success: true };
}
