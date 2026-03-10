"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";

export async function logPackage(data: {
  apartment_id: string;
  tracking_number?: string;
  carrier?: string;
  description: string;
  notes?: string;
}) {
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

  const { data: pkg, error } = await supabase
    .from("packages")
    .insert({
      building_id: profile.building_id,
      apartment_id: data.apartment_id,
      tracking_number: data.tracking_number || null,
      carrier: data.carrier || null,
      description: data.description,
      received_by: user.id,
      notes: data.notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Fire-and-forget: send notification email to apartment owners
  const { data: apartment } = await supabase
    .from("apartments")
    .select("unit_number")
    .eq("id", data.apartment_id)
    .single();

  const { data: building } = await supabase
    .from("buildings")
    .select("name")
    .eq("id", profile.building_id)
    .single();

  const { data: owners } = await supabase
    .from("apartment_owners")
    .select("profile_id")
    .eq("apartment_id", data.apartment_id);

  if (owners && owners.length > 0) {
    for (const owner of owners) {
      sendNotificationEmail({
        userId: owner.profile_id,
        type: "package_received",
        templateProps: {
          unitNumber: apartment?.unit_number ?? "",
          description: data.description,
          carrier: data.carrier ?? "",
          buildingName: building?.name ?? "",
          receivedAt: new Date().toLocaleString(),
        },
      }).catch(() => {});
    }
  }

  revalidatePath("/admin/packages");
  return { success: true, data: pkg };
}

export async function getPackages(filters?: {
  status?: string;
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
    .from("packages")
    .select(
      `*, apartments (id, unit_number), received_by_profile:profiles!packages_received_by_fkey (id, full_name), picked_up_by_profile:profiles!packages_picked_up_by_fkey (id, full_name)`
    )
    .eq("building_id", profile.building_id)
    .order("received_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.apartment_id)
    query = query.eq("apartment_id", filters.apartment_id);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function markPickedUp(id: string) {
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
    .from("packages")
    .update({
      status: "picked_up",
      picked_up_by: user.id,
      picked_up_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "notified"]);

  if (error) return { error: error.message };

  revalidatePath("/admin/packages");
  return { success: true };
}

export async function getPackageStats() {
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

  const { data: packages } = await supabase
    .from("packages")
    .select("status")
    .eq("building_id", profile.building_id);

  const stats = {
    pending: 0,
    notified: 0,
    picked_up: 0,
  };

  if (packages) {
    for (const pkg of packages) {
      if (pkg.status in stats) {
        stats[pkg.status as keyof typeof stats]++;
      }
    }
  }

  return { data: stats };
}
