"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMyPackages() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: [] };

  // Get user's apartment(s)
  const { data: ownerRecords } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id);

  if (!ownerRecords || ownerRecords.length === 0) {
    return { error: null, data: [] };
  }

  const apartmentIds = ownerRecords.map((r) => r.apartment_id);

  const { data, error } = await supabase
    .from("packages")
    .select(
      `*, apartments (id, unit_number)`
    )
    .in("apartment_id", apartmentIds)
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) return { error: error.message, data: [] };
  return { error: null, data: data || [] };
}
