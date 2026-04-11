"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { createNotification } from "@/lib/notifications/create";
import { getAdminProfileForModule } from "@/lib/actions/helpers";

export async function getAllVisitors(filters?: {
  status?: string;
  date?: string;
  apartment_id?: string;
  page?: number;
  per_page?: number;
}) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("visitors");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [], total: 0 };

  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const perPage = filters?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("visitors")
    .select(
      `*, profiles!registered_by(id, full_name), apartments (id, unit_number), visitor_companions(id)`,
      { count: "exact" }
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

  const { data, error, count } = await query.range(from, to);
  if (error) return { error: error.message, data: [], total: 0 };
  return { data: data || [], total: count ?? 0 };
}

async function fireFirstArrivalNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitorId: string,
  checkedInAt: string,
) {
  const { data: visitor } = await supabase
    .from("visitors")
    .select("registered_by, visitor_name, building_id")
    .eq("id", visitorId)
    .single();
  if (!visitor) return;

  const { count: companionCount } = await supabase
    .from("visitor_companions")
    .select("*", { count: "exact", head: true })
    .eq("visitor_id", visitorId);

  const { data: building } = await supabase
    .from("buildings")
    .select("name")
    .eq("id", visitor.building_id)
    .single();

  const totalGuests = 1 + (companionCount ?? 0);
  const titleSuffix = totalGuests > 1 ? ` (+${totalGuests - 1})` : "";
  const visitorLabel = `${visitor.visitor_name}${titleSuffix}`;

  sendNotificationEmail({
    userId: visitor.registered_by,
    type: "visitor_checkins",
    templateProps: {
      visitorName: visitorLabel,
      buildingName: building?.name ?? "",
      checkedInAt: new Date(checkedInAt).toLocaleString(),
    },
  }).catch(() => {});

  createNotification({
    userId: visitor.registered_by,
    type: "visitor_checkin",
    title: `${visitorLabel} has checked in`,
    body: `Your visitor arrived at ${new Date(checkedInAt).toLocaleTimeString()}`,
    data: { action_url: "/portal/visitors" },
  }).catch(() => {});
}

async function ensureAdmin() {
  return getAdminProfileForModule("visitors");
}

export async function checkInVisitorMember(
  visitorId: string,
  companionId: string | null,
) {
  const { error: authError, supabase, user } = await ensureAdmin();
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  // Refuse to mutate cancelled, expired or already-completed visitors.
  const { data: parent, error: parentError } = await supabase
    .from("visitors")
    .select("id, status, checked_in_at")
    .eq("id", visitorId)
    .single();
  if (parentError || !parent) return { error: "Visitor not found" };
  if (!["expected", "checked_in"].includes(parent.status)) {
    return { error: `Visitor is ${parent.status}` };
  }

  const checkedInAt = new Date().toISOString();

  if (companionId === null) {
    if (parent.checked_in_at) {
      return { error: "Primary visitor already checked in" };
    }
    const { error } = await supabase
      .from("visitors")
      .update({ checked_in_at: checkedInAt, checked_in_by: user.id })
      .eq("id", visitorId)
      .is("checked_in_at", null);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("visitor_companions")
      .update({ checked_in_at: checkedInAt, checked_in_by: user.id })
      .eq("id", companionId)
      .eq("visitor_id", visitorId)
      .is("checked_in_at", null);
    if (error) return { error: error.message };
  }

  // recompute_visitor_status holds FOR UPDATE on the parent and atomically
  // returns true exactly once — when this call wins the expected->checked_in
  // transition. Two concurrent companion check-ins cannot both observe
  // wasFirstArrival=true.
  const { data: wasFirstArrival, error: rpcError } = await supabase.rpc(
    "recompute_visitor_status",
    { p_visitor_id: visitorId },
  );
  if (rpcError) return { error: rpcError.message };

  if (wasFirstArrival === true) {
    await fireFirstArrivalNotifications(supabase, visitorId, checkedInAt);
  }

  revalidatePath("/admin/visitors");
  revalidatePath(`/admin/visitors/${visitorId}`);
  return { success: true };
}

export async function checkOutVisitorMember(
  visitorId: string,
  companionId: string | null,
) {
  const { error: authError, supabase, user } = await ensureAdmin();
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  const { data: parent, error: parentError } = await supabase
    .from("visitors")
    .select("status")
    .eq("id", visitorId)
    .single();
  if (parentError || !parent) return { error: "Visitor not found" };
  if (!["expected", "checked_in"].includes(parent.status)) {
    return { error: `Visitor is ${parent.status}` };
  }

  const checkedOutAt = new Date().toISOString();

  if (companionId === null) {
    const { error } = await supabase
      .from("visitors")
      .update({ checked_out_at: checkedOutAt, checked_out_by: user.id })
      .eq("id", visitorId)
      .not("checked_in_at", "is", null)
      .is("checked_out_at", null);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("visitor_companions")
      .update({ checked_out_at: checkedOutAt, checked_out_by: user.id })
      .eq("id", companionId)
      .eq("visitor_id", visitorId)
      .not("checked_in_at", "is", null)
      .is("checked_out_at", null);
    if (error) return { error: error.message };
  }

  const { error: rpcError } = await supabase.rpc("recompute_visitor_status", {
    p_visitor_id: visitorId,
  });
  if (rpcError) return { error: rpcError.message };

  revalidatePath("/admin/visitors");
  revalidatePath(`/admin/visitors/${visitorId}`);
  return { success: true };
}

export async function checkInVisitorGroup(visitorId: string) {
  const { error: authError, supabase, user } = await ensureAdmin();
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  // Atomic on the DB side: stamps parent + every still-expected companion
  // and recomputes status, all under one Postgres transaction. Returns the
  // first-arrival flag (true exactly once across concurrent callers).
  const { data: wasFirstArrival, error } = await supabase.rpc(
    "check_in_visitor_group",
    { p_visitor_id: visitorId, p_user_id: user.id },
  );
  if (error) return { error: error.message };

  if (wasFirstArrival === true) {
    await fireFirstArrivalNotifications(
      supabase,
      visitorId,
      new Date().toISOString(),
    );
  }

  revalidatePath("/admin/visitors");
  revalidatePath(`/admin/visitors/${visitorId}`);
  return { success: true };
}

export async function checkOutVisitorGroup(visitorId: string) {
  const { error: authError, supabase, user } = await ensureAdmin();
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase.rpc("check_out_visitor_group", {
    p_visitor_id: visitorId,
    p_user_id: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/visitors");
  revalidatePath(`/admin/visitors/${visitorId}`);
  return { success: true };
}

// Backwards-compatible aliases — older callers (e.g. visitor-table.tsx)
// invoke the primary-only check-in/out from the list view.
export async function checkInVisitor(id: string) {
  return checkInVisitorMember(id, null);
}

export async function checkOutVisitor(id: string) {
  return checkOutVisitorMember(id, null);
}

export async function getVisitorWithCompanions(visitorId: string) {
  const { error: authError, supabase, profile } = await ensureAdmin();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase
    .from("visitors")
    .select(
      `*,
       profiles!registered_by(id, full_name),
       apartments(id, unit_number),
       visitor_companions(id, position, name, id_number, phone, checked_in_at, checked_out_at)`,
    )
    .eq("id", visitorId)
    .eq("building_id", profile.building_id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getTodaysVisitors() {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("visitors");
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("visitors")
    .select(
      `*, profiles!registered_by(id, full_name), apartments (id, unit_number), visitor_companions(id)`
    )
    .eq("building_id", profile.building_id)
    .eq("status", "expected")
    .lte("valid_from", now)
    .gte("valid_until", now)
    .order("valid_from", { ascending: true });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function lookupByAccessCode(code: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("visitors");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase
    .from("visitors")
    .select(
      `*, apartments (id, unit_number), profiles!registered_by(id, full_name), visitor_companions(id)`
    )
    .eq("building_id", profile.building_id)
    .eq("access_code", code.toUpperCase())
    .single();

  if (error) return { error: "not_found" };
  return { data };
}
