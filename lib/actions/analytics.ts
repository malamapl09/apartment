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

export async function getCollectionRatesByMonth(year: number) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Fetch all charges for this year in one query
  const { data: charges, error: chargesError } = await supabase
    .from("charges")
    .select("amount, status, period_month, period_year")
    .eq("building_id", profile.building_id)
    .eq("period_year", year);

  if (chargesError) return { error: chargesError.message, data: [] };

  // Fetch all payments for this year — join through charges to get period info
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, charges!inner(period_month, period_year)")
    .eq("building_id", profile.building_id);

  if (paymentsError) return { error: paymentsError.message, data: [] };

  const result = months.map((month) => {
    const monthCharges = (charges || []).filter(
      (c) => c.period_month === month && c.period_year === year
    );
    const totalCharged = monthCharges.reduce((sum, c) => sum + c.amount, 0);

    const monthPayments = (payments || []).filter((p) => {
      const charge = p.charges as unknown as { period_month: number; period_year: number };
      return charge?.period_month === month && charge?.period_year === year;
    });
    const totalCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const collectionRate =
      totalCharged > 0 ? Math.round((totalCollected / totalCharged) * 100) : 0;

    return { month, totalCharged, totalCollected, collectionRate };
  });

  return { data: result, error: null };
}

export async function getMaintenanceTrends(months: number = 6) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data: requests, error: requestsError } = await supabase
    .from("maintenance_requests")
    .select("id, category, created_at")
    .eq("building_id", profile.building_id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (requestsError) return { error: requestsError.message, data: [] };
  if (!requests || requests.length === 0) return { data: [], error: null };

  // Group by month and category
  const grouped: Record<string, Record<string, number>> = {};

  for (const req of requests) {
    const date = new Date(req.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = {};
    const cat = req.category || "general";
    grouped[key][cat] = (grouped[key][cat] || 0) + 1;
  }

  const result = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, categories]) => ({
      month,
      ...categories,
    }));

  return { data: result, error: null };
}

export async function getVisitorStats(months: number = 6) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data: visitors, error: visitorsError } = await supabase
    .from("visitors")
    .select("id, status, created_at")
    .eq("building_id", profile.building_id)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (visitorsError) return { error: visitorsError.message, data: [] };
  if (!visitors || visitors.length === 0) return { data: [], error: null };

  const grouped: Record<string, { total: number; checkedIn: number }> = {};

  for (const v of visitors) {
    const date = new Date(v.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = { total: 0, checkedIn: 0 };
    grouped[key].total += 1;
    if (v.status === "checked_in" || v.status === "checked_out") {
      grouped[key].checkedIn += 1;
    }
  }

  const result = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({
      month,
      total: stats.total,
      checkedIn: stats.checkedIn,
      checkInRate: stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0,
    }));

  return { data: result, error: null };
}

export async function getOccupancyStats() {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  const { data: apartments, error: aptError } = await supabase
    .from("apartments")
    .select("status")
    .eq("building_id", profile.building_id);

  if (aptError) return { error: aptError.message, data: null };
  if (!apartments) return { data: { occupied: 0, vacant: 0 }, error: null };

  const occupied = apartments.filter((a) => a.status === "occupied").length;
  const vacant = apartments.filter((a) => a.status !== "occupied").length;

  return { data: { occupied, vacant }, error: null };
}

export async function getPortalSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: null };

  // Get user's apartment via apartment_owners
  const { data: ownerLink } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!ownerLink) return { error: null, data: { pendingCharges: 0, pendingAmount: 0, activeRequests: 0, upcomingVisitors: 0, unreadNotifications: 0 } };

  const apartmentId = ownerLink.apartment_id;
  const now = new Date().toISOString();

  // Run all queries in parallel
  const [chargesResult, maintenanceResult, visitorsResult, notificationsResult] =
    await Promise.all([
      // Pending charges
      supabase
        .from("charges")
        .select("amount, status")
        .eq("apartment_id", apartmentId)
        .in("status", ["pending", "partial"]),

      // Active maintenance requests
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .eq("apartment_id", apartmentId)
        .in("status", ["open", "in_progress", "waiting_parts"]),

      // Upcoming visitors
      supabase
        .from("visitors")
        .select("id", { count: "exact", head: true })
        .eq("apartment_id", apartmentId)
        .gte("valid_from", now)
        .in("status", ["expected"]),

      // Unread notifications
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
    ]);

  const firstError =
    chargesResult.error ||
    maintenanceResult.error ||
    visitorsResult.error ||
    notificationsResult.error;
  if (firstError) return { error: firstError.message, data: null };

  const pendingCharges = chargesResult.data || [];
  const pendingAmount = pendingCharges.reduce((sum, c) => sum + c.amount, 0);

  return {
    error: null,
    data: {
      pendingCharges: pendingCharges.length,
      pendingAmount,
      activeRequests: maintenanceResult.count || 0,
      upcomingVisitors: visitorsResult.count || 0,
      unreadNotifications: notificationsResult.count || 0,
    },
  };
}
