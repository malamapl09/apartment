"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { createNotification } from "@/lib/notifications/create";

export async function getAllVisitors(filters?: {
  status?: string;
  date?: string;
  apartment_id?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [] };
  }

  let query = supabase
    .from("visitors")
    .select(
      `*, profiles!registered_by(id, full_name), apartments (id, unit_number)`
    )
    .eq("building_id", profile.building_id)
    .order("valid_from", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.apartment_id)
    query = query.eq("apartment_id", filters.apartment_id);
  if (filters?.date) {
    const dateStart = `${filters.date}T00:00:00`;
    const dateEnd = `${filters.date}T23:59:59`;
    query = query.gte("valid_from", dateStart).lte("valid_from", dateEnd);
  }

  const { data, error } = await query.limit(500);
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function checkInVisitor(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  // Get visitor info before updating
  const { data: visitor } = await supabase
    .from("visitors")
    .select("registered_by, visitor_name, building_id")
    .eq("id", id)
    .single();

  const checkedInAt = new Date().toISOString();

  const { error } = await supabase
    .from("visitors")
    .update({
      status: "checked_in",
      checked_in_at: checkedInAt,
      checked_in_by: user.id,
    })
    .eq("id", id)
    .eq("status", "expected");

  if (error) return { error: error.message };

  // Fire-and-forget: send visitor check-in email and in-app notification
  if (visitor) {
    // Get building name
    const { data: building } = await supabase
      .from("buildings")
      .select("name")
      .eq("id", visitor.building_id)
      .single();

    sendNotificationEmail({
      userId: visitor.registered_by,
      type: "visitor_checkins",
      templateProps: {
        visitorName: visitor.visitor_name,
        buildingName: building?.name ?? "",
        checkedInAt: new Date(checkedInAt).toLocaleString(),
      },
    }).catch(() => {});

    createNotification({
      userId: visitor.registered_by,
      type: "visitor_checkin",
      title: `${visitor.visitor_name} has checked in`,
      body: `Your visitor arrived at ${new Date(checkedInAt).toLocaleTimeString()}`,
      data: { action_url: "/portal/visitors" },
    }).catch(() => {});
  }

  revalidatePath("/admin/visitors");
  return { success: true };
}

export async function checkOutVisitor(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("visitors")
    .update({
      status: "checked_out",
      checked_out_at: new Date().toISOString(),
      checked_out_by: user.id,
    })
    .eq("id", id)
    .eq("status", "checked_in");

  if (error) return { error: error.message };

  revalidatePath("/admin/visitors");
  return { success: true };
}

export async function getTodaysVisitors() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [] };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("visitors")
    .select(`*, profiles!registered_by(id, full_name), apartments (id, unit_number)`)
    .eq("building_id", profile.building_id)
    .eq("status", "expected")
    .lte("valid_from", now)
    .gte("valid_until", now)
    .order("valid_from", { ascending: true });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function lookupByAccessCode(code: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("visitors")
    .select(`*, apartments (id, unit_number), profiles!registered_by(id, full_name)`)
    .eq("building_id", profile.building_id)
    .eq("access_code", code.toUpperCase())
    .single();

  if (error) return { error: "not_found" };
  return { data };
}
