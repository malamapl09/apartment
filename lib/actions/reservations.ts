"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validateBooking } from "@/lib/reservations/validate-booking";

export async function createReservation(data: {
  space_id: string;
  start_time: string;  // ISO string
  end_time: string;    // ISO string
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  // Fetch space details
  const { data: space } = await supabase
    .from("public_spaces")
    .select("*")
    .eq("id", data.space_id)
    .single();
  if (!space) return { error: "Space not found" };
  if (!space.is_active) return { error: "Space is not available" };

  // Fetch schedules
  const { data: schedules } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("space_id", data.space_id);

  // Fetch blackouts
  const { data: blackouts } = await supabase
    .from("blackout_dates")
    .select("*")
    .eq("space_id", data.space_id);

  // Count monthly reservations for this user
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const { count: monthlyCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("space_id", data.space_id)
    .in("status", ["pending_payment", "payment_submitted", "confirmed"])
    .gte("start_time", startOfMonth.toISOString())
    .lt("start_time", endOfMonth.toISOString());

  // Check for time conflicts using DB function
  const { data: isAvailable } = await supabase.rpc("check_space_availability", {
    p_space_id: data.space_id,
    p_start: data.start_time,
    p_end: data.end_time,
  });

  // Validate booking
  const validation = validateBooking({
    space,
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    schedules: schedules || [],
    blackouts: blackouts || [],
    existingReservationsThisMonth: monthlyCount || 0,
    hasConflict: isAvailable === false,
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  // Calculate payment amount
  const durationHours = (new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / (1000 * 60 * 60);
  const paymentAmount = durationHours * space.hourly_rate + space.deposit_amount;

  // Generate reference code
  const { data: refCode } = await supabase.rpc("generate_reference_code");

  // Calculate payment deadline
  const { data: building } = await supabase
    .from("buildings")
    .select("payment_deadline_hours")
    .eq("id", profile.building_id)
    .single();

  const deadlineHours = building?.payment_deadline_hours || 48;
  const paymentDeadline = new Date();
  paymentDeadline.setHours(paymentDeadline.getHours() + deadlineHours);

  // Create reservation
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      building_id: profile.building_id,
      space_id: data.space_id,
      user_id: user.id,
      start_time: data.start_time,
      end_time: data.end_time,
      status: "pending_payment",
      reference_code: refCode,
      payment_amount: paymentAmount > 0 ? paymentAmount : null,
      payment_deadline: paymentAmount > 0 ? paymentDeadline.toISOString() : null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // If free space, auto-confirm
  if (paymentAmount === 0) {
    await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", reservation.id);
  }

  revalidatePath("/portal/reservations");
  return { success: true, data: reservation };
}

export async function getMyReservations(filter?: "upcoming" | "past" | "all") {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  let query = supabase
    .from("reservations")
    .select(`*, public_spaces (id, name, photos)`)
    .eq("user_id", user.id)
    .order("start_time", { ascending: false });

  if (filter === "upcoming") {
    query = query.gte("start_time", new Date().toISOString())
      .in("status", ["pending_payment", "payment_submitted", "confirmed"]);
  } else if (filter === "past") {
    query = query.lt("start_time", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getReservation(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reservations")
    .select(`*, public_spaces (*), profiles (id, full_name, email)`)
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function uploadPaymentProof(reservationId: string, fileUrl: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("reservations")
    .update({
      payment_proof_url: fileUrl,
      status: "payment_submitted",
    })
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .eq("status", "pending_payment");

  if (error) return { error: error.message };

  revalidatePath("/portal/reservations");
  revalidatePath(`/portal/reservations/${reservationId}`);
  return { success: true };
}

export async function cancelReservation(reservationId: string, reason?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "Cancelled by owner",
      cancelled_by: user.id,
    })
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .in("status", ["pending_payment", "payment_submitted"]);

  if (error) return { error: error.message };

  revalidatePath("/portal/reservations");
  return { success: true };
}
