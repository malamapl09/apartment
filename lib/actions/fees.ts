"use server";

import { getAuthProfileForModule } from "@/lib/actions/helpers";

export async function getMyCharges(filter?: "pending" | "paid" | "all") {
  const { error: authError, supabase, user } = await getAuthProfileForModule("fees");
  if (authError || !user) return { error: authError ?? "Unauthorized", data: [] };

  // Get apartment IDs for this user via apartment_owners
  const { data: ownership } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id);

  if (!ownership || ownership.length === 0) return { data: [] };

  const apartmentIds = ownership.map(
    (o: { apartment_id: string }) => o.apartment_id
  );

  let query = supabase
    .from("charges")
    .select(`*, fee_types (id, name, category), payments (*)`)
    .in("apartment_id", apartmentIds)
    .order("due_date", { ascending: false });

  if (filter === "pending") {
    query = query.in("status", ["pending", "overdue", "partial"]);
  } else if (filter === "paid") {
    query = query.eq("status", "paid");
  }

  const { data, error } = await query.limit(100);
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getMyPayments() {
  const { error: authError, supabase, user } = await getAuthProfileForModule("fees");
  if (authError || !user) return { error: authError ?? "Unauthorized", data: [] };

  const { data: ownership } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id);

  if (!ownership || ownership.length === 0) return { data: [] };

  const apartmentIds = ownership.map(
    (o: { apartment_id: string }) => o.apartment_id
  );

  const { data, error } = await supabase
    .from("payments")
    .select(
      `*, charges (id, amount, period_month, period_year, fee_types (id, name, category))`
    )
    .in("apartment_id", apartmentIds)
    .order("payment_date", { ascending: false })
    .limit(100);

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function getMyBalance() {
  const { error: authError, supabase, user } = await getAuthProfileForModule("fees");
  if (authError || !user) return { error: authError ?? "Unauthorized", balance: 0 };

  const { data: ownership } = await supabase
    .from("apartment_owners")
    .select("apartment_id")
    .eq("profile_id", user.id);

  if (!ownership || ownership.length === 0) return { balance: 0 };

  const apartmentIds = ownership.map(
    (o: { apartment_id: string }) => o.apartment_id
  );

  const { data: charges } = await supabase
    .from("charges")
    .select("id, amount, payments (amount)")
    .in("apartment_id", apartmentIds)
    .in("status", ["pending", "overdue", "partial"]);

  if (!charges) return { balance: 0 };

  const balance = charges.reduce(
    (sum: number, charge: { amount: number; payments: { amount: number }[] }) => {
      const paid = (charge.payments || []).reduce(
        (s: number, p: { amount: number }) => s + p.amount,
        0
      );
      return sum + Math.max(0, charge.amount - paid);
    },
    0
  );

  return { balance };
}
