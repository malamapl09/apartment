"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FeeCategory, FeeType, PaymentMethod } from "@/types";

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

export async function createFeeType(data: {
  name: string;
  category: FeeCategory;
  default_amount: number;
  is_recurring?: boolean;
  description?: string;
}) {
  const { error: authError, supabase, user, profile } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  const { error } = await supabase.from("fee_types").insert({
    building_id: profile.building_id,
    name: data.name,
    category: data.category,
    default_amount: data.default_amount,
    is_recurring: data.is_recurring ?? false,
    description: data.description ?? null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/fees");
  return { success: true };
}

export async function getFeeTypes() {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  const { data, error } = await supabase
    .from("fee_types")
    .select("*")
    .eq("building_id", profile.building_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function updateFeeType(id: string, data: Partial<FeeType>) {
  const { error: authError, supabase } = await getAdminProfile();
  if (authError) return { error: authError };

  // Pick only updatable fields — omit read-only server fields
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.default_amount !== undefined) updateData.default_amount = data.default_amount;
  if (data.is_recurring !== undefined) updateData.is_recurring = data.is_recurring;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { error } = await supabase
    .from("fee_types")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/fees");
  return { success: true };
}

export async function generateMonthlyCharges(
  feeTypeId: string,
  month: number,
  year: number
) {
  const { error: authError, supabase, user, profile } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized", count: 0 };

  // Get fee type details
  const { data: feeType } = await supabase
    .from("fee_types")
    .select("*")
    .eq("id", feeTypeId)
    .eq("building_id", profile.building_id)
    .single();

  if (!feeType) return { error: "Fee type not found", count: 0 };

  // Get all occupied apartments in the building
  const { data: apartments } = await supabase
    .from("apartments")
    .select("id")
    .eq("building_id", profile.building_id)
    .eq("status", "occupied");

  if (!apartments || apartments.length === 0) {
    return { error: null, count: 0 };
  }

  // Calculate due date = last day of the month
  const dueDate = new Date(year, month, 0); // day 0 of next month = last day of this month
  const dueDateStr = dueDate.toISOString().split("T")[0];

  // Build inserts, handle UNIQUE constraint (apartment_id, fee_type_id, period_month, period_year)
  let createdCount = 0;
  for (const apartment of apartments) {
    const { error: insertError } = await supabase.from("charges").insert({
      building_id: profile.building_id,
      apartment_id: apartment.id,
      fee_type_id: feeTypeId,
      amount: feeType.default_amount,
      due_date: dueDateStr,
      period_month: month,
      period_year: year,
      status: "pending",
      created_by: user.id,
    });

    if (!insertError) {
      createdCount++;
    }
    // Silently skip unique constraint violations (charge already exists for this period)
  }

  revalidatePath("/admin/fees");
  return { error: null, count: createdCount };
}

export async function getCharges(filters?: {
  apartment_id?: string;
  status?: string;
  month?: number;
  year?: number;
}) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  let query = supabase
    .from("charges")
    .select(`*, fee_types (id, name, category), apartments (id, unit_number), payments (*)`)
    .eq("building_id", profile.building_id)
    .order("created_at", { ascending: false });

  if (filters?.apartment_id) query = query.eq("apartment_id", filters.apartment_id);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.month) query = query.eq("period_month", filters.month);
  if (filters?.year) query = query.eq("period_year", filters.year);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}

export async function recordPayment(data: {
  charge_id: string;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}) {
  const { error: authError, supabase, user, profile } = await getAdminProfile();
  if (authError || !profile || !user) return { error: authError ?? "Unauthorized" };

  // Get charge info
  const { data: charge } = await supabase
    .from("charges")
    .select("*, payments (*)")
    .eq("id", data.charge_id)
    .single();

  if (!charge) return { error: "Charge not found" };

  // Insert the payment
  const { error: paymentError } = await supabase.from("payments").insert({
    charge_id: data.charge_id,
    building_id: charge.building_id,
    apartment_id: charge.apartment_id,
    amount: data.amount,
    payment_date: data.payment_date,
    payment_method: data.payment_method ?? null,
    reference_number: data.reference_number ?? null,
    notes: data.notes ?? null,
    recorded_by: user.id,
  });

  if (paymentError) return { error: paymentError.message };

  // Calculate total paid so far including the new payment
  const existingPaid = (charge.payments as { amount: number }[]).reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const totalPaid = existingPaid + data.amount;

  // Update charge status
  let newStatus: "paid" | "partial" | "pending";
  if (totalPaid >= charge.amount) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partial";
  } else {
    newStatus = "pending";
  }

  await supabase
    .from("charges")
    .update({ status: newStatus })
    .eq("id", data.charge_id);

  revalidatePath("/admin/fees");
  revalidatePath("/portal/fees");
  return { success: true };
}

export async function getPayments(filters?: {
  apartment_id?: string;
  month?: number;
  year?: number;
}) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: [] };

  let query = supabase
    .from("payments")
    .select(`*, charges (id, amount, period_month, period_year, fee_types (id, name)), apartments (id, unit_number)`)
    .eq("building_id", profile.building_id)
    .order("payment_date", { ascending: false });

  if (filters?.apartment_id) query = query.eq("apartment_id", filters.apartment_id);
  if (filters?.month) {
    // Filter by the charge's period month via a join — use a range on payment_date instead
    // since we can't filter nested join fields directly in supabase-js, filter post-query
  }

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };

  let result = data || [];

  // Post-filter by month/year of the related charge (nested join fields can't be filtered in supabase-js directly)
  type PaymentWithCharge = typeof result[number] & {
    charges: { period_month: number; period_year: number } | null;
  };
  let filtered = result as PaymentWithCharge[];

  if (filters?.month !== undefined) {
    filtered = filtered.filter((p) => p.charges?.period_month === filters.month);
  }
  if (filters?.year !== undefined) {
    filtered = filtered.filter((p) => p.charges?.period_year === filters.year);
  }

  return { data: filtered };
}

export async function getFinancialSummary(month?: number, year?: number) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  let chargesQuery = supabase
    .from("charges")
    .select("amount, status")
    .eq("building_id", profile.building_id);

  let paymentsQuery = supabase
    .from("payments")
    .select("amount")
    .eq("building_id", profile.building_id);

  if (month) {
    chargesQuery = chargesQuery.eq("period_month", month);
  }
  if (year) {
    chargesQuery = chargesQuery.eq("period_year", year);
  }

  const [{ data: charges }, { data: payments }] = await Promise.all([
    chargesQuery,
    paymentsQuery,
  ]);

  const totalCharged = (charges || []).reduce(
    (sum: number, c: { amount: number }) => sum + c.amount,
    0
  );
  const totalCollected = (payments || []).reduce(
    (sum: number, p: { amount: number }) => sum + p.amount,
    0
  );
  const outstanding = Math.max(0, totalCharged - totalCollected);
  const collectionRate =
    totalCharged > 0 ? Math.round((totalCollected / totalCharged) * 100) : 0;

  return {
    data: { totalCharged, totalCollected, outstanding, collectionRate },
    error: null,
  };
}
