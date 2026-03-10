"use server";

import { createClient } from "@/lib/supabase/server";

async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Unauthorized" as const, supabase, user: null, profile: null };
  }

  return { error: null, supabase, user, profile };
}

export async function getAuditLogs(filters?: {
  action?: string;
  table_name?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile)
    return { error: authError ?? "Unauthorized", data: [], total: 0 };

  const validActions = ["create", "update", "delete"];
  if (filters?.action && !validActions.includes(filters.action)) {
    return { error: `Invalid action filter: ${filters.action}`, data: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(filters?.page ?? 1));
  const perPage = filters?.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("audit_logs")
    .select("*, profiles:user_id(id, full_name, email)", { count: "exact" })
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.table_name) query = query.eq("table_name", filters.table_name);
  if (filters?.user_id) query = query.eq("user_id", filters.user_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", `${filters.date_to}T23:59:59.999Z`);

  const { data, error, count } = await query;

  if (error) return { error: error.message, data: [], total: 0 };
  return { data: data || [], total: count ?? 0 };
}

export async function getAuditUsers() {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("building_id", profile.building_id)
    .in("role", ["admin", "super_admin"])
    .order("full_name");

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}
