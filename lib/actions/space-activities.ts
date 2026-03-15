"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthProfile } from "@/lib/actions/helpers";

const createActivitySchema = z.object({
  space_id: z.string().uuid("Invalid space ID"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(500).optional(),
  start_time: z.string().datetime("Invalid start time format"),
  end_time: z.string().datetime("Invalid end time format"),
});

export async function createSpaceActivity(data: {
  space_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
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
