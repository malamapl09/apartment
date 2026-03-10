"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FeeCategory, FeeType, PaymentMethod } from "@/types";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { getAdminProfile } from "@/lib/actions/helpers";

const createFeeTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["maintenance_fee", "common_area", "parking", "special_assessment", "other"], {
    error: "Invalid fee category",
  }),
  default_amount: z.number().positive("Amount must be a positive number"),
  is_recurring: z.boolean().optional(),
  description: z.string().optional(),
});

export async function createFeeType(data: {
  name: string;
  category: FeeCategory;
  default_amount: number;
  is_recurring?: boolean;
  description?: string;
}) {
  const parsed = createFeeTypeSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

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
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized" };

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
    .eq("id", id)
    .eq("building_id", profile.building_id);

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

  const apartmentIds = apartments.map((a) => a.id);

  // Batch-fetch all apartment owners in one query instead of per-apartment
  const { data: allOwners } = await supabase
    .from("apartment_owners")
    .select("profile_id, apartment_id, apartments (unit_number)")
    .in("apartment_id", apartmentIds);

  // Group owners by apartment_id for quick lookup
  const ownersByApartment = new Map<string, typeof allOwners>();
  if (allOwners) {
    for (const owner of allOwners) {
      const existing = ownersByApartment.get(owner.apartment_id) || [];
      existing.push(owner);
      ownersByApartment.set(owner.apartment_id, existing);
    }
  }

  // Build all charge objects at once
  const allCharges = apartments.map((apartment) => ({
    building_id: profile.building_id,
    apartment_id: apartment.id,
    fee_type_id: feeTypeId,
    amount: feeType.default_amount,
    due_date: dueDateStr,
    period_month: month,
    period_year: year,
    status: "pending" as const,
    created_by: user.id,
  }));

  // Single batch insert — rows that violate the UNIQUE constraint
  // (apartment_id, fee_type_id, period_month, period_year) will cause the
  // entire insert to fail, so we use individual inserts only as fallback.
  let createdCount = 0;
  const { error: batchError, data: insertedRows } = await supabase
    .from("charges")
    .insert(allCharges)
    .select("apartment_id");

  if (!batchError && insertedRows) {
    // Batch insert succeeded — all charges were new
    createdCount = insertedRows.length;

    // Fire-and-forget: send notification emails for all created charges
    for (const row of insertedRows) {
      const owners = ownersByApartment.get(row.apartment_id) || [];
      for (const owner of owners) {
        const unitNumber = (owner as any).apartments?.unit_number ?? "";
        sendNotificationEmail({
          userId: owner.profile_id,
          type: "new_charges",
          templateProps: {
            amount: String(feeType.default_amount),
            feeType: feeType.name,
            dueDate: dueDateStr,
            apartmentUnit: unitNumber,
          },
        }).catch(() => {});
      }
    }
  } else {
    // Batch insert failed (likely due to some duplicates) — fall back to individual inserts
    for (const charge of allCharges) {
      const { error: insertError } = await supabase.from("charges").insert(charge);
      if (!insertError) {
        createdCount++;
        const owners = ownersByApartment.get(charge.apartment_id) || [];
        for (const owner of owners) {
          const unitNumber = (owner as any).apartments?.unit_number ?? "";
          sendNotificationEmail({
            userId: owner.profile_id,
            type: "new_charges",
            templateProps: {
              amount: String(feeType.default_amount),
              feeType: feeType.name,
              dueDate: dueDateStr,
              apartmentUnit: unitNumber,
            },
          }).catch(() => {});
        }
      }
      // Silently skip unique constraint violations (charge already exists for this period)
    }
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

  const { data, error } = await query.limit(500);
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

  // Get charge info — scoped to admin's building
  const { data: charge } = await supabase
    .from("charges")
    .select("*, payments (*)")
    .eq("id", data.charge_id)
    .eq("building_id", profile.building_id)
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

  // Use charges!inner join so we can filter by charge period at the DB level
  const needsPeriodFilter = filters?.month !== undefined || filters?.year !== undefined;
  const chargesJoin = needsPeriodFilter ? "charges!inner" : "charges";

  let query = supabase
    .from("payments")
    .select(`*, ${chargesJoin} (id, amount, period_month, period_year, fee_types (id, name)), apartments (id, unit_number)`)
    .eq("building_id", profile.building_id)
    .order("payment_date", { ascending: false });

  if (filters?.apartment_id) query = query.eq("apartment_id", filters.apartment_id);
  if (filters?.month !== undefined) {
    query = query.eq("charges.period_month", filters.month);
  }
  if (filters?.year !== undefined) {
    query = query.eq("charges.period_year", filters.year);
  }

  const { data, error } = await query.limit(500);
  if (error) return { error: error.message, data: [] };

  return { data: data || [] };
}

export async function getFinancialSummary(month?: number, year?: number) {
  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  let chargesQuery = supabase
    .from("charges")
    .select("amount, status")
    .eq("building_id", profile.building_id);

  // Use charges!inner join to filter payments by the charge's period at the DB level
  const needsPeriodFilter = month || year;
  const chargesJoin = needsPeriodFilter ? "charges!inner" : "charges";

  let paymentsQuery = supabase
    .from("payments")
    .select(`amount, ${chargesJoin} (period_month, period_year)`)
    .eq("building_id", profile.building_id);

  if (month) {
    chargesQuery = chargesQuery.eq("period_month", month);
    paymentsQuery = paymentsQuery.eq("charges.period_month", month);
  }
  if (year) {
    chargesQuery = chargesQuery.eq("period_year", year);
    paymentsQuery = paymentsQuery.eq("charges.period_year", year);
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
