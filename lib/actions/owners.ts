"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function getOwners(searchQuery?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found", data: [] };

  let query = supabase
    .from("profiles")
    .select(`
      *,
      apartment_owners (
        *,
        apartments (id, unit_number, floor)
      )
    `)
    .eq("building_id", profile.building_id)
    .in("role", ["owner", "resident"])
    .order("full_name");

  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getOwner(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      apartment_owners (
        *,
        apartments (id, unit_number, floor, area_sqm, bedrooms, bathrooms, status)
      )
    `)
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateOwner(id: string, formData: FormData) {
  const supabase = await createClient();

  const updateSchema = z.object({
    full_name: z.string().min(2),
    phone: z.string().optional().nullable(),
    national_id: z.string().optional().nullable(),
    emergency_contact: z.object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    }).optional().nullable(),
  });

  const emergencyContactRaw = formData.get("emergency_contact_name")
    ? {
        name: formData.get("emergency_contact_name") as string,
        phone: formData.get("emergency_contact_phone") as string,
        relationship: formData.get("emergency_contact_relationship") as string,
      }
    : null;

  const result = updateSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || null,
    national_id: formData.get("national_id") || null,
    emergency_contact: emergencyContactRaw,
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("profiles")
    .update(result.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${id}`);
  return { success: true };
}

export async function linkApartment(profileId: string, apartmentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("apartment_owners")
    .insert({
      profile_id: profileId,
      apartment_id: apartmentId,
      is_primary: false,
      move_in_date: new Date().toISOString().split("T")[0],
    });

  if (error) return { error: error.message };

  await supabase
    .from("apartments")
    .update({ status: "occupied" })
    .eq("id", apartmentId);

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${profileId}`);
  return { success: true };
}

export async function unlinkApartment(profileId: string, apartmentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("apartment_owners")
    .delete()
    .eq("profile_id", profileId)
    .eq("apartment_id", apartmentId);

  if (error) return { error: error.message };

  // Check if apartment still has owners
  const { count } = await supabase
    .from("apartment_owners")
    .select("*", { count: "exact", head: true })
    .eq("apartment_id", apartmentId);

  if (count === 0) {
    await supabase
      .from("apartments")
      .update({ status: "vacant" })
      .eq("id", apartmentId);
  }

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${profileId}`);
  return { success: true };
}

export async function toggleOwnerActive(id: string, isActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${id}`);
  return { success: true };
}
