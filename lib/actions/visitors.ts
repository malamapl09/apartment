"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const companionSchema = z.object({
  name: z.string().min(1).max(200),
  id_number: z.string().max(50).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

const registerVisitorSchema = z.object({
  visitor_name: z.string().min(1, "Visitor name is required"),
  visitor_id_number: z.string().optional(),
  visitor_phone: z.string().optional(),
  vehicle_plate: z.string().optional(),
  vehicle_description: z.string().optional(),
  purpose: z.string().optional(),
  valid_from: z.string().datetime("Invalid valid_from date format"),
  valid_until: z.string().datetime("Invalid valid_until date format"),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.string().optional(),
  recurrence_end_date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  companions: z.array(companionSchema).max(20).optional(),
});

export type RegisterVisitorInput = z.input<typeof registerVisitorSchema>;

export async function registerVisitor(data: RegisterVisitorInput) {
  const parsed = registerVisitorSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

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

  const primaryPayload = {
    name: parsed.data.visitor_name,
    id_number: parsed.data.visitor_id_number ?? null,
    phone: parsed.data.visitor_phone ?? null,
    vehicle_plate: parsed.data.vehicle_plate ?? null,
    vehicle_description: parsed.data.vehicle_description ?? null,
    purpose: parsed.data.purpose ?? null,
    notes: parsed.data.notes ?? null,
    valid_from: parsed.data.valid_from,
    valid_until: parsed.data.valid_until,
    is_recurring: parsed.data.is_recurring ?? false,
    recurrence_pattern: parsed.data.recurrence_pattern ?? null,
    recurrence_end_date: parsed.data.recurrence_end_date ?? null,
  };

  const companionsPayload = (parsed.data.companions ?? [])
    .filter((c) => c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      id_number: c.id_number ?? null,
      phone: c.phone ?? null,
    }));

  const { data: visitorId, error: rpcError } = await supabase.rpc(
    "create_visitor_with_companions",
    {
      p_building_id: profile.building_id,
      p_apartment_id: ownerRecord.apartment_id,
      p_registered_by: user.id,
      p_primary: primaryPayload,
      p_companions: companionsPayload,
    },
  );

  if (rpcError || !visitorId) {
    return { error: rpcError?.message ?? "Failed to register visitor" };
  }

  const { data: visitor } = await supabase
    .from("visitors")
    .select("*")
    .eq("id", visitorId as string)
    .single();

  revalidatePath("/portal/visitors");
  return {
    success: true,
    data: visitor,
    companionCount: companionsPayload.length,
  };
}

export async function getMyVisitors(filter?: "expected" | "past" | "all") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  let query = supabase
    .from("visitors")
    .select("*, visitor_companions(id, name)")
    .eq("registered_by", user.id)
    .order("valid_from", { ascending: false });

  if (filter === "expected") {
    query = query.eq("status", "expected");
  } else if (filter === "past") {
    query = query.in("status", ["checked_out", "expired", "cancelled"]);
  }

  const { data, error } = await query.limit(100);
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
