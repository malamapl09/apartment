"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfileForModule } from "@/lib/actions/helpers";
import { createNotification } from "@/lib/notifications/create";

export async function getReservations(filters?: {
  status?: string;
  space_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [], total: 0 };

  const { data: profile } = await supabase
    .from("profiles").select("building_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const perPage = filters?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("reservations")
    .select(`*, public_spaces (id, name), profiles!user_id(id, full_name, email)`, { count: "exact" })
    .eq("building_id", profile.building_id)
    .order("start_time", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.space_id) query = query.eq("space_id", filters.space_id);
  if (filters?.date_from) query = query.gte("start_time", filters.date_from);
  if (filters?.date_to) query = query.lte("start_time", filters.date_to);

  const { data, error, count } = await query.range(from, to);
  if (error) return { error: error.message, data: [], total: 0 };
  return { data: data || [], total: count ?? 0 };
}

export async function getPendingPayments(params?: {
  page?: number;
  per_page?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [], total: 0 };

  const { data: profile } = await supabase
    .from("profiles").select("building_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const perPage = params?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from("reservations")
    .select(`*, public_spaces (id, name), profiles!user_id(id, full_name, email, phone)`, { count: "exact" })
    .eq("building_id", profile.building_id)
    .eq("status", "payment_submitted")
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) return { error: error.message, data: [], total: 0 };
  return { data: data || [], total: count ?? 0 };
}

export async function verifyPayment(reservationId: string) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("user_id, reference_code")
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .single();

  if (!reservation) return { error: "Reservation not found" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      payment_verified_by: user.id,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .eq("status", "payment_submitted");

  if (error) return { error: error.message };

  createNotification({
      userId: reservation.user_id,
      type: "reservation_status",
      title: "Payment verified",
      body: `Your reservation ${reservation.reference_code} has been confirmed`,
      data: { action_url: `/portal/reservations/${reservationId}` },
  }).catch(() => {});

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}

export async function rejectPayment(reservationId: string, reason: string) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("user_id, reference_code")
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .single();

  if (!reservation) return { error: "Reservation not found" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "pending_payment",
      payment_proof_url: null,
      payment_rejected_reason: reason,
    })
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .eq("status", "payment_submitted");

  if (error) return { error: error.message };

  createNotification({
    userId: reservation.user_id,
    type: "reservation_status",
    title: "Payment rejected",
    body: `Your payment for reservation ${reservation.reference_code} was rejected: ${reason}`,
    data: { action_url: `/portal/reservations/${reservationId}` },
  }).catch(() => {});

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}

export async function adminCancelReservation(reservationId: string, reason: string) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("reservations");
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("user_id, reference_code")
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .single();

  if (!reservation) return { error: "Reservation not found" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: user.id,
    })
    .eq("id", reservationId)
    .eq("building_id", profile.building_id)
    .in("status", ["pending_payment", "payment_submitted", "confirmed"]);

  if (error) return { error: error.message };

  createNotification({
    userId: reservation.user_id,
    type: "reservation_status",
    title: "Reservation cancelled",
    body: `Your reservation ${reservation.reference_code} was cancelled: ${reason}`,
    data: { action_url: `/portal/reservations/${reservationId}` },
  }).catch(() => {});

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}
