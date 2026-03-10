"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerVisitor(data: {
  visitor_name: string;
  visitor_id_number?: string;
  visitor_phone?: string;
  vehicle_plate?: string;
  vehicle_description?: string;
  purpose?: string;
  valid_from: string;
  valid_until: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const { data: ownerRecord } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id)
    .single();
  if (!ownerRecord) return { error: "No apartment found for this user" };

  const { data: visitor, error } = await supabase
    .from("visitors")
    .insert({
      building_id: profile.building_id,
      apartment_id: ownerRecord.apartment_id,
      registered_by: user.id,
      visitor_name: data.visitor_name,
      visitor_id_number: data.visitor_id_number || null,
      visitor_phone: data.visitor_phone || null,
      vehicle_plate: data.vehicle_plate || null,
      vehicle_description: data.vehicle_description || null,
      purpose: data.purpose || null,
      valid_from: data.valid_from,
      valid_until: data.valid_until,
      is_recurring: data.is_recurring ?? false,
      recurrence_pattern: data.recurrence_pattern || null,
      recurrence_end_date: data.recurrence_end_date || null,
      notes: data.notes || null,
      status: "expected",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/portal/visitors");
  return { success: true, data: visitor };
}

export async function getMyVisitors(filter?: "expected" | "past" | "all") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  let query = supabase
    .from("visitors")
    .select("*")
    .eq("registered_by", user.id)
    .order("valid_from", { ascending: false });

  if (filter === "expected") {
    query = query.eq("status", "expected");
  } else if (filter === "past") {
    query = query.in("status", ["checked_out", "expired", "cancelled"]);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function cancelVisitor(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("visitors")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("registered_by", user.id)
    .eq("status", "expected");

  if (error) return { error: error.message };

  revalidatePath("/portal/visitors");
  return { success: true };
}
