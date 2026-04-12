"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthProfileForModule } from "@/lib/actions/helpers";
import { createBulkNotifications } from "@/lib/notifications/create";

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
  notes: z.string().max(500).optional(),
  companions: z.array(companionSchema).max(20).optional(),
});

export type RegisterVisitorInput = z.input<typeof registerVisitorSchema>;

const BLACKLIST_ERROR =
  "This visitor cannot be registered. Contact building management.";

export async function registerVisitor(data: RegisterVisitorInput) {
  const parsed = registerVisitorSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error: authError, supabase, user, profile } = await getAuthProfileForModule("visitors");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const { data: ownerRecord } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id)
    .single();
  if (!ownerRecord) return { error: "No apartment found for this user" };

  // Check blacklist for primary + every companion before writing anything.
  const { data: primaryBlocked, error: primaryBlockError } = await supabase.rpc(
    "is_visitor_blacklisted",
    {
      p_building_id: profile.building_id,
      p_name: parsed.data.visitor_name,
      p_id_number: parsed.data.visitor_id_number ?? null,
      p_phone: parsed.data.visitor_phone ?? null,
    },
  );
  if (primaryBlockError) return { error: primaryBlockError.message };
  if (primaryBlocked === true) return { error: BLACKLIST_ERROR };

  const companionsInput = (parsed.data.companions ?? []).filter((c) =>
    c.name.trim(),
  );
  for (const companion of companionsInput) {
    const { data: compBlocked, error: compBlockError } = await supabase.rpc(
      "is_visitor_blacklisted",
      {
        p_building_id: profile.building_id,
        p_name: companion.name,
        p_id_number: companion.id_number ?? null,
        p_phone: companion.phone ?? null,
      },
    );
    if (compBlockError) return { error: compBlockError.message };
    if (compBlocked === true) return { error: BLACKLIST_ERROR };
  }

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
  };

  const companionsPayload = companionsInput.map((c) => ({
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
  const { error: authError, supabase, user } = await getAuthProfileForModule("visitors");
  if (authError || !user) return { error: authError ?? "Unauthorized", data: [] };

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
  const { error: authError, supabase, user } = await getAuthProfileForModule("visitors");
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  // Load first so we have building_id + name for the admin notification.
  const { data: visitor } = await supabase
    .from("visitors")
    .select("id, building_id, visitor_name, apartments(unit_number)")
    .eq("id", id)
    .eq("registered_by", user.id)
    .eq("status", "expected")
    .single();
  if (!visitor) return { error: "Visitor not found" };

  const { error } = await supabase
    .from("visitors")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("registered_by", user.id)
    .eq("status", "expected");

  if (error) return { error: error.message };

  // Fire-and-forget: tell every building admin the visit was cancelled
  // so the lobby staff doesn't let the guest in when they show up.
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("building_id", visitor.building_id)
    .in("role", ["admin", "super_admin"]);

  const adminIds = (admins ?? []).map((a) => a.id);
  if (adminIds.length > 0) {
    const apartment = Array.isArray(visitor.apartments)
      ? visitor.apartments[0]
      : visitor.apartments;
    const unit = (apartment as { unit_number?: string } | null)?.unit_number ?? "—";

    createBulkNotifications(adminIds, {
      type: "visitor_cancelled",
      title: `Visit cancelled: ${visitor.visitor_name}`,
      body: `Unit ${unit} cancelled their expected visitor.`,
      data: { action_url: `/admin/visitors/${id}` },
    }).catch(() => {});
  }

  revalidatePath("/portal/visitors");
  return { success: true };
}
