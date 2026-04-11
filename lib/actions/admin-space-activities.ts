"use server";

import { revalidatePath } from "next/cache";
import { getAdminProfileForModule } from "@/lib/actions/helpers";

export async function adminCancelSpaceActivity(activityId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId)) {
    return { error: "Invalid activity ID" };
  }

  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("reservations");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  const { data: updated, error } = await supabase
    .from("space_activities")
    .update({
      status: "cancelled",
      cancelled_by: user.id,
    })
    .eq("id", activityId)
    .eq("building_id", profile.building_id)
    .eq("status", "active")
    .select("id")
    .single();

  if (error) return { error: "Activity not found or already cancelled" };
  if (!updated) return { error: "Activity not found or already cancelled" };

  revalidatePath("/portal/spaces");
  revalidatePath("/admin/reservations");
  return { success: true };
}
