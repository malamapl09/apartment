"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  validateBooking,
  type BookingErrorKey,
} from "@/lib/reservations/validate-booking";
import { getAuthProfileForModule } from "@/lib/actions/helpers";

const createReservationSchema = z.object({
  space_id: z.string().uuid("Invalid space ID"),
  start_time: z.string().datetime("Invalid start time format"),
  end_time: z.string().datetime("Invalid end time format"),
  notes: z.string().max(1000).optional(),
});

export async function createReservation(data: {
  space_id: string;
  start_time: string;  // ISO string
  end_time: string;    // ISO string
  notes?: string;
}) {
  const parsed = createReservationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

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
  if (space.allow_reservations === false) {
    return { error: "This space does not accept reservations" };
  }

  // Fetch building timezone for TZ-aware hour counting
  const { data: building } = await supabase
    .from("buildings")
    .select("timezone, payment_deadline_hours")
    .eq("id", profile.building_id)
    .single();
  const buildingTimezone = building?.timezone || "UTC";

  // Start monthly count early (wait on it later)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const [
    schedulesRes,
    blackoutsRes,
    recurringBlackoutsRes,
    monthlyCountRes,
    restrictionRes,
    bookedHoursRes,
    isAvailableRes,
  ] = await Promise.all([
    supabase
      .from("availability_schedules")
      .select("*")
      .eq("space_id", data.space_id),
    supabase
      .from("blackout_dates")
      .select("*")
      .eq("space_id", data.space_id),
    supabase
      .from("recurring_blackouts")
      .select("*")
      .eq("space_id", data.space_id),
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("space_id", data.space_id)
      .in("status", ["pending_payment", "payment_submitted", "confirmed"])
      .gte("start_time", startOfMonth.toISOString())
      .lt("start_time", endOfMonth.toISOString()),
    supabase.rpc("has_active_restriction", {
      p_profile_id: user.id,
      p_space_id: data.space_id,
    }),
    supabase.rpc("get_user_space_booked_hours", {
      p_user_id: user.id,
      p_space_id: data.space_id,
      p_booking_start: data.start_time,
      p_timezone: buildingTimezone,
    }),
    supabase.rpc("check_space_availability", {
      p_space_id: data.space_id,
      p_start: data.start_time,
      p_end: data.end_time,
    }),
  ]);

  // Fail closed if any critical lookup errored — never let booking proceed on
  // incomplete information. The restriction, conflict, and hour-cap RPCs are
  // all part of the enforcement chain.
  if (
    schedulesRes.error ||
    blackoutsRes.error ||
    recurringBlackoutsRes.error ||
    monthlyCountRes.error ||
    restrictionRes.error ||
    bookedHoursRes.error ||
    isAvailableRes.error
  ) {
    return {
      error:
        "Could not verify booking eligibility. Please try again in a moment.",
    };
  }

  const bookedHoursRow = Array.isArray(bookedHoursRes.data)
    ? bookedHoursRes.data[0]
    : bookedHoursRes.data;

  const validation = validateBooking({
    space,
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    timezone: buildingTimezone,
    schedules: schedulesRes.data || [],
    blackouts: (blackoutsRes.data || []) as import("@/types").BlackoutDate[],
    recurringBlackouts:
      (recurringBlackoutsRes.data || []) as import("@/types").RecurringBlackout[],
    existingReservationsThisMonth: monthlyCountRes.count || 0,
    hoursBookedToday: Number(bookedHoursRow?.hours_today ?? 0),
    hoursBookedThisWeek: Number(bookedHoursRow?.hours_week ?? 0),
    hoursBookedThisMonth: Number(bookedHoursRow?.hours_month ?? 0),
    hasRestriction: restrictionRes.data === true,
    hasConflict: isAvailableRes.data === false,
  });

  if (!validation.valid) {
    const t = (await getTranslations("portal.reservations.errors")) as unknown as (
      key: string,
      values?: Record<string, string | number>,
    ) => string;
    const key = (validation.errorKey as BookingErrorKey).replace(
      "reservation.",
      "",
    );
    return { error: t(key, validation.errorParams) };
  }

  // Calculate payment amount
  const durationHours = (new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / (1000 * 60 * 60);
  const paymentAmount = durationHours * space.hourly_rate + space.deposit_amount;

  // Generate reference code
  const { data: refCode } = await supabase.rpc("generate_reference_code");

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

  // Upcoming sorts soonest-first; past/all show most-recent-first.
  const ascending = filter === "upcoming";

  let query = supabase
    .from("reservations")
    .select(`*, public_spaces (id, name, photos)`)
    .eq("user_id", user.id)
    .order("start_time", { ascending });

  if (filter === "upcoming") {
    query = query.gte("start_time", new Date().toISOString())
      .in("status", ["pending_payment", "payment_submitted", "confirmed"]);
  } else if (filter === "past") {
    query = query.lt("start_time", new Date().toISOString());
  }

  const { data, error } = await query.limit(100);
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getReservation(id: string) {
  const { error: authError, supabase, user, profile } = await getAuthProfileForModule("reservations");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase
    .from("reservations")
    .select(`*, public_spaces (*), profiles!user_id(id, full_name, email)`)
    .eq("id", id)
    .eq("building_id", profile.building_id)
    .single();

  if (error) return { error: error.message };

  // Non-admin users can only view their own reservations
  if (!["admin", "super_admin"].includes(profile.role) && data.user_id !== user.id) {
    return { error: "Unauthorized" };
  }

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

  // Use .select() so we can detect a no-op update (e.g. the admin verified
  // the payment in the background between page-load and click). Without this
  // the silent zero-row update would return success and leave the user
  // looking at an unchanged page.
  const { data: updated, error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "Cancelled by owner",
      cancelled_by: user.id,
    })
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .in("status", ["pending_payment", "payment_submitted"])
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) {
    return {
      error: "Reservation could not be cancelled. It may have already been confirmed or cancelled.",
    };
  }

  revalidatePath("/portal/reservations");
  return { success: true };
}
