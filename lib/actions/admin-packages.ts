"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfileForModule, getAuthProfileForModule } from "@/lib/actions/helpers";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { createNotification } from "@/lib/notifications/create";

const logPackageSchema = z.object({
  apartment_id: z.string().uuid("Invalid apartment ID"),
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  notes: z.string().max(500).optional(),
});

export async function logPackage(data: {
  apartment_id: string;
  tracking_number?: string;
  carrier?: string;
  description: string;
  notes?: string;
}) {
  const parsed = logPackageSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("packages");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

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

      createNotification({
        userId: owner.profile_id,
        type: "package",
        title: "Package received",
        body: `A package has arrived for unit ${apartment?.unit_number ?? ""}: ${data.description}`,
        data: { action_url: "/portal/packages" },
      }).catch(() => {});
    }
  }

  revalidatePath("/admin/packages");
  return { error: null, data: pkg };
}

export async function getPackages(filters?: {
  status?: string;
  apartment_id?: string;
  page?: number;
  per_page?: number;
}) {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("packages");

  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [], total: 0 };

  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const perPage = filters?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("packages")
    .select(
      `*, apartments (id, unit_number), received_by_profile:profiles!packages_received_by_fkey (id, full_name), picked_up_by_profile:profiles!packages_picked_up_by_fkey (id, full_name)`,
      { count: "exact" }
    )
    .eq("building_id", profile.building_id)
    .order("received_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.apartment_id)
    query = query.eq("apartment_id", filters.apartment_id);

  const { data, error, count } = await query.range(from, to);
  if (error) return { error: error.message, data: [], total: 0 };
  return { error: null, data: data || [], total: count ?? 0 };
}

export async function markPickedUp(id: string) {
  const { error: authError, supabase, user, profile } = await getAdminProfileForModule("packages");
  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

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
  return { error: null };
}

export async function getPackageStats() {
  const { error: authError, supabase, profile } = await getAdminProfileForModule("packages");

  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

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

  return { error: null, data: stats };
}
