"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthProfile } from "@/lib/actions/helpers";

const createActivitySchema = z
  .object({
    space_id: z.string().uuid("Invalid space ID"),
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().max(500).optional(),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    is_recurring: z.boolean().optional(),
    recurrence_pattern: z.enum(["daily", "weekly", "monthly"]).optional(),
    recurrence_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  })
  .refine(
    (data) => {
      if (data.is_recurring) {
        return !!data.recurrence_pattern && !!data.recurrence_end_date;
      }
      return true;
    },
    {
      message:
        "Recurrence pattern and end date are required for recurring activities",
    }
  )
  .refine(
    (data) => {
      if (data.is_recurring && data.recurrence_end_date) {
        return new Date(data.recurrence_end_date) > new Date(data.start_time);
      }
      return true;
    },
    { message: "Recurrence end date must be after start date" }
  );

function generateOccurrenceDates(
  startDate: Date,
  pattern: "daily" | "weekly" | "monthly",
  endDate: Date
): Date[] {
  const dates: Date[] = [startDate];
  const maxOccurrences = 52;
  const originalDay = startDate.getDate();

  let monthsAdded = 0;

  while (dates.length < maxOccurrences) {
    let next: Date;

    if (pattern === "daily") {
      next = new Date(startDate);
      next.setDate(startDate.getDate() + dates.length);
    } else if (pattern === "weekly") {
      next = new Date(startDate);
      next.setDate(startDate.getDate() + dates.length * 7);
    } else {
      // Monthly: clamp day to last day of target month to avoid rollover
      monthsAdded++;
      next = new Date(startDate);
      next.setDate(1); // avoid rollover during setMonth
      next.setMonth(startDate.getMonth() + monthsAdded);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDay));
    }

    if (next > endDate) break;
    dates.push(next);
  }

  return dates;
}

export async function createSpaceActivity(data: {
  space_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly";
  recurrence_end_date?: string;
}) {
  const parsed = createActivitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const validated = parsed.data;

  const { error: authError, supabase, user, profile } = await getAuthProfile();
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  // Verify space exists and is active
  const { data: space } = await supabase
    .from("public_spaces")
    .select("id, is_active")
    .eq("id", validated.space_id)
    .eq("building_id", profile.building_id)
    .single();

  if (!space) return { error: "Space not found" };
  if (!space.is_active) return { error: "Space is not available" };

  // Validate time range
  if (new Date(validated.end_time) <= new Date(validated.start_time)) {
    return { error: "End time must be after start time" };
  }

  if (validated.is_recurring && validated.recurrence_pattern && validated.recurrence_end_date) {
    const recurrenceGroupId = crypto.randomUUID();
    const startDate = new Date(validated.start_time);
    const endDate = new Date(validated.recurrence_end_date);
    const occurrenceDates = generateOccurrenceDates(
      startDate,
      validated.recurrence_pattern,
      endDate
    );

    // Calculate the time difference to apply to each occurrence
    const startMs = startDate.getTime();
    const endMs = new Date(validated.end_time).getTime();
    const durationMs = endMs - startMs;

    const rows = occurrenceDates.map((date) => ({
      building_id: profile.building_id,
      space_id: validated.space_id,
      user_id: user.id,
      title: validated.title,
      description: validated.description || null,
      start_time: date.toISOString(),
      end_time: new Date(date.getTime() + durationMs).toISOString(),
      is_recurring: true,
      recurrence_pattern: validated.recurrence_pattern!,
      recurrence_end_date: validated.recurrence_end_date!,
      recurrence_group_id: recurrenceGroupId,
    }));

    const { data: activities, error } = await supabase
      .from("space_activities")
      .insert(rows)
      .select();

    if (error) return { error: error.message };

    revalidatePath("/portal/spaces");
    return { data: activities };
  }

  // Single activity
  const { data: activity, error } = await supabase
    .from("space_activities")
    .insert({
      building_id: profile.building_id,
      space_id: validated.space_id,
      user_id: user.id,
      title: validated.title,
      description: validated.description || null,
      start_time: validated.start_time,
      end_time: validated.end_time,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/portal/spaces");
  return { data: activity };
}

export async function cancelSpaceActivity(activityId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId)) {
    return { error: "Invalid activity ID" };
  }

  const { error: authError, supabase, user, profile } = await getAuthProfile();
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const { data: updated, error } = await supabase
    .from("space_activities")
    .update({
      status: "cancelled",
      cancelled_by: user.id,
    })
    .eq("id", activityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("id")
    .single();

  if (error) return { error: "Activity not found or already cancelled" };
  if (!updated) return { error: "Activity not found or already cancelled" };

  revalidatePath("/portal/spaces");
  return { success: true };
}

export async function cancelRecurringActivities(recurrenceGroupId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recurrenceGroupId)) {
    return { error: "Invalid recurrence group ID" };
  }

  const { error: authError, supabase, user, profile } = await getAuthProfile();
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  // Verify ownership via the first activity in the group
  const { data: firstActivity } = await supabase
    .from("space_activities")
    .select("id, user_id")
    .eq("recurrence_group_id", recurrenceGroupId)
    .eq("building_id", profile.building_id)
    .limit(1)
    .single();

  if (!firstActivity) return { error: "Recurring activities not found" };
  if (firstActivity.user_id !== user.id) return { error: "Unauthorized" };

  // Cancel all future active activities in this group
  const { error } = await supabase
    .from("space_activities")
    .update({
      status: "cancelled",
      cancelled_by: user.id,
    })
    .eq("recurrence_group_id", recurrenceGroupId)
    .eq("status", "active")
    .gte("start_time", new Date().toISOString());

  if (error) return { error: error.message };

  revalidatePath("/portal/spaces");
  return { success: true };
}
