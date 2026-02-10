"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const apartmentSchema = z.object({
  unit_number: z.string().min(1, "Unit number is required"),
  floor: z.coerce.number().int().optional().nullable(),
  area_sqm: z.coerce.number().positive().optional().nullable(),
  bedrooms: z.coerce.number().int().nonnegative().optional().nullable(),
  bathrooms: z.coerce.number().int().nonnegative().optional().nullable(),
  status: z.enum(["occupied", "vacant"]).default("vacant"),
});

export async function getApartments(searchQuery?: string) {
  const supabase = await createClient();

  // Get user's building_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found", data: [] };

  let query = supabase
    .from("apartments")
    .select(`
      *,
      apartment_owners (
        *,
        profiles (id, full_name, email, phone)
      )
    `)
    .eq("building_id", profile.building_id)
    .order("unit_number");

  if (searchQuery) {
    query = query.ilike("unit_number", `%${searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getApartment(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("apartments")
    .select(`
      *,
      apartment_owners (
        *,
        profiles (id, full_name, email, phone)
      )
    `)
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createApartment(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const result = apartmentSchema.safeParse({
    unit_number: formData.get("unit_number"),
    floor: formData.get("floor") || null,
    area_sqm: formData.get("area_sqm") || null,
    bedrooms: formData.get("bedrooms") || null,
    bathrooms: formData.get("bathrooms") || null,
    status: formData.get("status") || "vacant",
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("apartments")
    .insert({
      ...result.data,
      building_id: profile.building_id,
    });

  if (error) return { error: error.message };

  revalidatePath("/admin/apartments");
  return { success: true };
}

export async function updateApartment(id: string, formData: FormData) {
  const supabase = await createClient();

  const result = apartmentSchema.safeParse({
    unit_number: formData.get("unit_number"),
    floor: formData.get("floor") || null,
    area_sqm: formData.get("area_sqm") || null,
    bedrooms: formData.get("bedrooms") || null,
    bathrooms: formData.get("bathrooms") || null,
    status: formData.get("status") || "vacant",
  });

  if (!result.success) {
    return { error: "Validation failed", details: result.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("apartments")
    .update(result.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/apartments");
  revalidatePath(`/admin/apartments/${id}`);
  return { success: true };
}

export async function deleteApartment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("apartments")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/apartments");
  return { success: true };
}
