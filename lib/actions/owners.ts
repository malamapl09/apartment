"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getAdminProfile } from "@/lib/actions/helpers";

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
    // Escape PostgREST LIKE wildcards to prevent filter injection
    const sanitized = searchQuery.replace(/[%_]/g, "\\$&");
    query = query.or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getOwner(id: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

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
    .eq("building_id", profile.building_id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateOwner(id: string, formData: FormData) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

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
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${id}`);
  return { success: true };
}

export async function linkApartment(profileId: string, apartmentId: string) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  // Verify the target profile belongs to the admin's building
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("building_id", profile.building_id)
    .single();
  if (!targetProfile) return { error: "Owner not found in your building" };

  // Verify the apartment belongs to the admin's building
  const { data: apartment } = await supabase
    .from("apartments")
    .select("id")
    .eq("id", apartmentId)
    .eq("building_id", profile.building_id)
    .single();
  if (!apartment) return { error: "Apartment not found in your building" };

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
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  // Verify the target profile belongs to the admin's building
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("building_id", profile.building_id)
    .single();
  if (!targetProfile) return { error: "Owner not found in your building" };

  // Verify the apartment belongs to the admin's building
  const { data: apartment } = await supabase
    .from("apartments")
    .select("id")
    .eq("id", apartmentId)
    .eq("building_id", profile.building_id)
    .single();
  if (!apartment) return { error: "Apartment not found in your building" };

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
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${id}`);
  return { success: true };
}
