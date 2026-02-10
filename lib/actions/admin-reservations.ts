"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getReservations(filters?: {
  status?: string;
  space_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles").select("building_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [] };
  }

  let query = supabase
    .from("reservations")
    .select(`*, public_spaces (id, name), profiles (id, full_name, email)`)
    .eq("building_id", profile.building_id)
    .order("start_time", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.space_id) query = query.eq("space_id", filters.space_id);
  if (filters?.date_from) query = query.gte("start_time", filters.date_from);
  if (filters?.date_to) query = query.lte("start_time", filters.date_to);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getPendingPayments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  const { data: profile } = await supabase
    .from("profiles").select("building_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized", data: [] };
  }

  const { data, error } = await supabase
    .from("reservations")
    .select(`*, public_spaces (id, name), profiles (id, full_name, email, phone)`)
    .eq("building_id", profile.building_id)
    .eq("status", "payment_submitted")
    .order("created_at", { ascending: true });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function verifyPayment(reservationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed",
      payment_verified_by: user.id,
      payment_verified_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("status", "payment_submitted");

  if (error) return { error: error.message };

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}

export async function rejectPayment(reservationId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "pending_payment",
      payment_proof_url: null,
      payment_rejected_reason: reason,
    })
    .eq("id", reservationId)
    .eq("status", "payment_submitted");

  if (error) return { error: error.message };

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}

export async function adminCancelReservation(reservationId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: user.id,
    })
    .eq("id", reservationId)
    .in("status", ["pending_payment", "payment_submitted", "confirmed"]);

  if (error) return { error: error.message };

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/pending");
  return { success: true };
}
