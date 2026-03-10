"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  type:
    | "apartment"
    | "owner"
    | "maintenance"
    | "visitor"
    | "announcement"
    | "package"
    | "poll"
    | "document";
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
}

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { results: [] as SearchResult[] };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [] as SearchResult[] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("building_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { results: [] as SearchResult[] };

  const isAdmin = ["admin", "super_admin"].includes(profile.role);
  const escaped = query.trim().replace(/[%_\\]/g, "\\$&");
  const searchTerm = `%${escaped}%`;
  const results: SearchResult[] = [];

  // Run all searches in parallel
  const [
    apartmentsRes,
    profilesRes,
    maintenanceRes,
    announcementsRes,
    visitorsRes,
    packagesRes,
    pollsRes,
    documentsRes,
  ] = await Promise.all([
    // Search apartments
    supabase
      .from("apartments")
      .select("id, unit_number")
      .eq("building_id", profile.building_id)
      .ilike("unit_number", searchTerm)
      .limit(3),

    // Search profiles/owners (admin only)
    isAdmin
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("building_id", profile.building_id)
          .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(3)
      : Promise.resolve({ data: null }),

    // Search maintenance requests
    supabase
      .from("maintenance_requests")
      .select("id, title, reference_code")
      .eq("building_id", profile.building_id)
      .or(`title.ilike.${searchTerm},reference_code.ilike.${searchTerm}`)
      .limit(3),

    // Search announcements
    supabase
      .from("announcements")
      .select("id, title")
      .eq("building_id", profile.building_id)
      .ilike("title", searchTerm)
      .limit(3),

    // Search visitors
    supabase
      .from("visitors")
      .select("id, visitor_name, access_code")
      .eq("building_id", profile.building_id)
      .or(`visitor_name.ilike.${searchTerm},access_code.ilike.${searchTerm}`)
      .limit(3),

    // Search packages
    supabase
      .from("packages")
      .select("id, tracking_number, description, carrier")
      .eq("building_id", profile.building_id)
      .or(
        `tracking_number.ilike.${searchTerm},description.ilike.${searchTerm},carrier.ilike.${searchTerm}`
      )
      .limit(3),

    // Search polls
    supabase
      .from("polls")
      .select("id, title")
      .eq("building_id", profile.building_id)
      .ilike("title", searchTerm)
      .limit(3),

    // Search documents
    supabase
      .from("documents")
      .select("id, title, category")
      .eq("building_id", profile.building_id)
      .ilike("title", searchTerm)
      .limit(3),
  ]);

  // Map apartments
  if (apartmentsRes.data) {
    results.push(
      ...apartmentsRes.data.map((a) => ({
        type: "apartment" as const,
        id: a.id,
        title: `Apt. ${a.unit_number}`,
        href: isAdmin ? `/admin/apartments/${a.id}` : undefined,
      }))
    );
  }

  // Map owners
  if (profilesRes.data) {
    results.push(
      ...profilesRes.data.map((p) => ({
        type: "owner" as const,
        id: p.id,
        title: p.full_name || p.email || "Unknown",
        subtitle: p.email || undefined,
        href: `/admin/owners/${p.id}`,
      }))
    );
  }

  // Map maintenance
  if (maintenanceRes.data) {
    results.push(
      ...maintenanceRes.data.map((m) => ({
        type: "maintenance" as const,
        id: m.id,
        title: m.title,
        subtitle: m.reference_code || undefined,
        href: isAdmin
          ? `/admin/maintenance/${m.id}`
          : `/portal/maintenance/${m.id}`,
      }))
    );
  }

  // Map announcements
  if (announcementsRes.data) {
    results.push(
      ...announcementsRes.data.map((a) => ({
        type: "announcement" as const,
        id: a.id,
        title: a.title,
        href: isAdmin ? `/admin/announcements` : `/portal/announcements`,
      }))
    );
  }

  // Map visitors
  if (visitorsRes.data) {
    results.push(
      ...visitorsRes.data.map((v) => ({
        type: "visitor" as const,
        id: v.id,
        title: v.visitor_name,
        subtitle: v.access_code || undefined,
        href: isAdmin ? `/admin/visitors` : `/portal/visitors`,
      }))
    );
  }

  // Map packages
  if (packagesRes.data) {
    results.push(
      ...packagesRes.data.map((p) => ({
        type: "package" as const,
        id: p.id,
        title: p.description || p.tracking_number || "Package",
        subtitle: p.carrier || p.tracking_number || undefined,
        href: isAdmin ? `/admin/packages` : `/portal/packages`,
      }))
    );
  }

  // Map polls
  if (pollsRes.data) {
    results.push(
      ...pollsRes.data.map((p) => ({
        type: "poll" as const,
        id: p.id,
        title: p.title,
        href: isAdmin ? `/admin/polls` : `/portal/polls`,
      }))
    );
  }

  // Map documents
  if (documentsRes.data) {
    results.push(
      ...documentsRes.data.map((d) => ({
        type: "document" as const,
        id: d.id,
        title: d.title,
        subtitle: d.category || undefined,
        href: isAdmin ? `/admin/documents` : `/portal/documents`,
      }))
    );
  }

  return { results };
}
