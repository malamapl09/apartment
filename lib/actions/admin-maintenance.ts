"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceStatus } from "@/types";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { createNotification } from "@/lib/notifications/create";

export async function getMaintenanceRequests(filters?: {
  status?: string;
  priority?: string;
  category?: string;
  page?: number;
  per_page?: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [], total: 0 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const perPage = filters?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("maintenance_requests")
    .select(
      `*, profiles (id, full_name, email), apartments (id, unit_number)`,
      { count: "exact" }
    )
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.category) query = query.eq("category", filters.category);

  const { data, error, count } = await query.range(from, to);
  if (error) return { error: error.message, data: [], total: 0 };
  return { data: data || [], total: count ?? 0 };
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
  assignedTo?: string
) {
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

  const updates: Record<string, unknown> = { status };

  if (status === "resolved") {
    updates.resolved_at = new Date().toISOString();
  }
  if (status === "closed") {
    updates.closed_at = new Date().toISOString();
  }
  if (assignedTo !== undefined) {
    updates.assigned_to = assignedTo || null;
    if (assignedTo) {
      updates.assigned_at = new Date().toISOString();
    }
  }

  const { data: request } = await supabase
    .from("maintenance_requests")
    .select("requested_by, reference_code, title")
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();

  if (!request) return { error: "Maintenance request not found" };

  const { error } = await supabase
    .from("maintenance_requests")
    .update(updates)
    .eq("id", id)
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message };

  // Fire-and-forget: send maintenance update email and in-app notification
  if (request) {
    sendNotificationEmail({
      userId: request.requested_by,
      type: "maintenance_updates",
      templateProps: {
        referenceCode: request.reference_code,
        title: request.title,
        newStatus: status,
      },
    }).catch(() => {});

    createNotification({
      userId: request.requested_by,
      type: "maintenance_update",
      title: `Maintenance request updated`,
      body: `${request.reference_code}: ${request.title} — status changed to ${status.replace("_", " ")}`,
      data: { action_url: `/portal/maintenance/${id}` },
    }).catch(() => {});
  }

  revalidatePath("/admin/maintenance");
  revalidatePath(`/admin/maintenance/${id}`);
  return { success: true };
}

export async function addInternalNote(requestId: string, body: string) {
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

  // Verify the maintenance request belongs to the admin's building
  const { data: request } = await supabase
    .from("maintenance_requests")
    .select("id")
    .eq("id", requestId)
    .eq("building_id", profile.building_id)
    .single();
  if (!request) return { error: "Maintenance request not found" };

  const { error } = await supabase.from("maintenance_comments").insert({
    request_id: requestId,
    user_id: user.id,
    body,
    is_internal: true,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/maintenance/${requestId}`);
  return { success: true };
}

export async function getMaintenanceStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: null };
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("status")
    .eq("building_id", profile.building_id);

  if (error) return { error: error.message, data: null };

  const counts = (data || []).reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    data: {
      open: counts["open"] || 0,
      in_progress: counts["in_progress"] || 0,
      waiting_parts: counts["waiting_parts"] || 0,
      resolved: counts["resolved"] || 0,
      closed: counts["closed"] || 0,
    },
  };
}
