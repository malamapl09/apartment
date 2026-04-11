"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfileForModule, getAuthProfileForModule } from "@/lib/actions/helpers";
import { z } from "zod";
import type { MaintenanceCategory, MaintenancePriority } from "@/types";

const createMaintenanceRequestSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["plumbing", "electrical", "hvac", "structural", "pest_control", "general"], {
    error: "Invalid category",
  }),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    error: "Invalid priority",
  }),
  photos: z.array(z.string().url()).optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000, "Comment must be under 2000 characters"),
});

export async function createMaintenanceRequest(data: {
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  photos?: string[];
}) {
  const parsed = createMaintenanceRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error: authError, supabase, user, profile } = await getAuthProfileForModule("maintenance");


  if (authError || !user || !profile) return { error: authError ?? "Unauthorized" };

  // Get the user's apartment via apartment_owners
  const { data: apartmentOwner } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: request, error } = await supabase
    .from("maintenance_requests")
    .insert({
      building_id: profile.building_id,
      apartment_id: apartmentOwner?.apartment_id ?? null,
      requested_by: user.id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      photos: data.photos ?? [],
      status: "open",
      reference_code: "",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/portal/maintenance");
  return { success: true, data: request };
}

export async function getMyMaintenanceRequests(filter?: "open" | "resolved" | "all") {
  const { error: authError, supabase, user } = await getAuthProfileForModule("maintenance");
  if (authError || !user) return { error: authError ?? "Unauthorized", data: [] };

  let query = supabase
    .from("maintenance_requests")
    .select(`*, apartments (id, unit_number)`)
    .eq("requested_by", user.id)
    .order("created_at", { ascending: false });

  if (filter === "open") {
    query = query.in("status", ["open", "in_progress", "waiting_parts"]);
  } else if (filter === "resolved") {
    query = query.in("status", ["resolved", "closed"]);
  }

  const { data, error } = await query.limit(100);
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getMaintenanceRequest(id: string) {
  const { error: authError, supabase, user } = await getAuthProfileForModule("maintenance");
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(
      `*, apartments (id, unit_number), profiles (id, full_name, email), maintenance_comments (*, profiles (id, full_name))`
    )
    .eq("id", id)
    .single();

  if (error) return { error: error.message };

  // Only return if the user owns the request or is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile && ["admin", "super_admin"].includes(profile.role);
  if (data.requested_by !== user.id && !isAdmin) {
    return { error: "Unauthorized" };
  }

  return { data };
}

export async function addComment(requestId: string, body: string) {
  const parsed = addCommentSchema.safeParse({ body });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const { error: authError, supabase, user } = await getAuthProfileForModule("maintenance");
  if (authError || !user) return { error: authError ?? "Unauthorized" };

  // Verify the user owns the request or is admin
  const { data: request } = await supabase
    .from("maintenance_requests")
    .select("requested_by")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Request not found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile && ["admin", "super_admin"].includes(profile.role);
  if (request.requested_by !== user.id && !isAdmin) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase.from("maintenance_comments").insert({
    request_id: requestId,
    user_id: user.id,
    body,
    is_internal: false,
  });

  if (error) return { error: error.message };

  revalidatePath(`/portal/maintenance/${requestId}`);
  return { success: true };
}
