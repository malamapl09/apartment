"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Sanitize a value for safe CSV output.
 * - Strips leading characters that trigger formula execution in Excel (=, +, -, @, \t, \r)
 * - Escapes embedded double quotes by doubling them
 * - Wraps the result in double quotes
 */
function escapeCsvCell(value: string): string {
  let sanitized = value.replace(/^[=+\-@\t\r]+/, "");
  sanitized = sanitized.replace(/"/g, '""');
  return `"${sanitized}"`;
}

function validateMonthYear(month: number, year: number): string | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return "Invalid month";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return "Invalid year";
  return null;
}

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

export async function getFinancialReportData(month: number, year: number) {
  const validationError = validateMonthYear(month, year);
  if (validationError) return { error: validationError, data: null };

  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  // Get charges for the period
  const { data: charges, error: chargesError } = await supabase
    .from("charges")
    .select(`*, fee_types (id, name, category), apartments (id, unit_number), payments (*)`)
    .eq("building_id", profile.building_id)
    .eq("period_month", month)
    .eq("period_year", year)
    .order("created_at", { ascending: false });

  if (chargesError) return { error: chargesError.message, data: null };

  const chargesList = charges || [];

  // Calculate summary
  const totalCharged = chargesList.reduce(
    (sum: number, c: { amount: number }) => sum + c.amount,
    0
  );

  const totalCollected = chargesList.reduce(
    (sum: number, c: { payments: { amount: number }[] }) => {
      const paid = (c.payments || []).reduce(
        (pSum: number, p: { amount: number }) => pSum + p.amount,
        0
      );
      return sum + paid;
    },
    0
  );

  const outstanding = Math.max(0, totalCharged - totalCollected);
  const collectionRate =
    totalCharged > 0 ? Math.round((totalCollected / totalCharged) * 100) : 0;

  // Group by status
  const byStatus: Record<string, number> = {};
  chargesList.forEach((c: { status: string }) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });

  // Group by fee category
  const byCategory: Record<string, { count: number; amount: number }> = {};
  chargesList.forEach(
    (c: {
      amount: number;
      fee_types: { category: string } | null;
    }) => {
      const cat = c.fee_types?.category || "other";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, amount: 0 };
      byCategory[cat].count++;
      byCategory[cat].amount += c.amount;
    }
  );

  return {
    error: null,
    data: {
      charges: chargesList.map(
        (c: {
          id: string;
          amount: number;
          status: string;
          due_date: string;
          apartments: { unit_number: string } | null;
          fee_types: { name: string; category: string } | null;
          payments: { amount: number }[];
        }) => ({
          id: c.id,
          apartment: c.apartments?.unit_number || "N/A",
          feeType: c.fee_types?.name || "N/A",
          category: c.fee_types?.category || "other",
          amount: c.amount,
          paid: (c.payments || []).reduce(
            (s: number, p: { amount: number }) => s + p.amount,
            0
          ),
          status: c.status,
          dueDate: c.due_date,
        })
      ),
      summary: {
        totalCharged,
        totalCollected,
        outstanding,
        collectionRate,
      },
      byStatus,
      byCategory,
    },
  };
}

export async function getMaintenanceReportData(month: number, year: number) {
  const validationError = validateMonthYear(month, year);
  if (validationError) return { error: validationError, data: null };

  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: requests, error: reqError } = await supabase
    .from("maintenance_requests")
    .select(`*, apartments (id, unit_number)`)
    .eq("building_id", profile.building_id)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (reqError) return { error: reqError.message, data: null };

  const requestsList = requests || [];

  // Group by status
  const byStatus: Record<string, number> = {};
  requestsList.forEach((r: { status: string }) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });

  // Group by category
  const byCategory: Record<string, number> = {};
  requestsList.forEach((r: { category: string }) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  });

  // Group by priority
  const byPriority: Record<string, number> = {};
  requestsList.forEach((r: { priority: string }) => {
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
  });

  // Calculate average resolution time (for resolved/closed requests)
  const resolvedRequests = requestsList.filter(
    (r: { resolved_at: string | null; created_at: string }) => r.resolved_at
  );
  let avgResolutionDays = 0;
  if (resolvedRequests.length > 0) {
    const totalDays = resolvedRequests.reduce(
      (sum: number, r: { resolved_at: string; created_at: string }) => {
        const created = new Date(r.created_at).getTime();
        const resolved = new Date(r.resolved_at).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60 * 24);
      },
      0
    );
    avgResolutionDays = Math.round((totalDays / resolvedRequests.length) * 10) / 10;
  }

  return {
    error: null,
    data: {
      requests: requestsList.map(
        (r: {
          id: string;
          reference_code: string;
          title: string;
          status: string;
          priority: string;
          category: string;
          created_at: string;
          resolved_at: string | null;
          apartments: { unit_number: string } | null;
        }) => ({
          id: r.id,
          reference: r.reference_code,
          title: r.title,
          apartment: r.apartments?.unit_number || "N/A",
          status: r.status,
          priority: r.priority,
          category: r.category,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
        })
      ),
      totalRequests: requestsList.length,
      byStatus,
      byCategory,
      byPriority,
      avgResolutionDays,
    },
  };
}

export async function getChargesCSV(month: number, year: number) {
  const validationError = validateMonthYear(month, year);
  if (validationError) return { error: validationError, data: null };

  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  const { data: charges, error } = await supabase
    .from("charges")
    .select(`*, fee_types (id, name, category), apartments (id, unit_number), payments (*)`)
    .eq("building_id", profile.building_id)
    .eq("period_month", month)
    .eq("period_year", year)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };

  const rows = (charges || []).map(
    (c: {
      apartments: { unit_number: string } | null;
      fee_types: { name: string; category: string } | null;
      amount: number;
      status: string;
      due_date: string;
      period_month: number;
      period_year: number;
      payments: { amount: number }[];
    }) => ({
      apartment: c.apartments?.unit_number || "N/A",
      feeType: c.fee_types?.name || "N/A",
      category: c.fee_types?.category || "other",
      amount: c.amount,
      paid: (c.payments || []).reduce(
        (s: number, p: { amount: number }) => s + p.amount,
        0
      ),
      status: c.status,
      dueDate: c.due_date,
      period: `${c.period_month}/${c.period_year}`,
    })
  );

  // Build CSV
  const headers = [
    "Apartment",
    "Fee Type",
    "Category",
    "Amount",
    "Paid",
    "Balance",
    "Status",
    "Due Date",
    "Period",
  ];
  const csvLines = [
    headers.join(","),
    ...rows.map(
      (r: {
        apartment: string;
        feeType: string;
        category: string;
        amount: number;
        paid: number;
        status: string;
        dueDate: string;
        period: string;
      }) =>
        [
          escapeCsvCell(r.apartment),
          escapeCsvCell(r.feeType),
          escapeCsvCell(r.category),
          r.amount,
          r.paid,
          r.amount - r.paid,
          escapeCsvCell(r.status),
          escapeCsvCell(r.dueDate),
          escapeCsvCell(r.period),
        ].join(",")
    ),
  ];

  return { error: null, data: csvLines.join("\n") };
}

export async function getPaymentsCSV(month: number, year: number) {
  const validationError = validateMonthYear(month, year);
  if (validationError) return { error: validationError, data: null };

  const { error: authError, supabase, profile } = await getAdminProfile();
  if (authError || !profile) return { error: authError ?? "Unauthorized", data: null };

  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      `*, charges!inner (id, amount, period_month, period_year, fee_types (id, name)), apartments (id, unit_number)`
    )
    .eq("building_id", profile.building_id)
    .eq("charges.period_month", month)
    .eq("charges.period_year", year)
    .order("payment_date", { ascending: false });

  if (error) return { error: error.message, data: null };

  type PaymentRow = {
    amount: number;
    payment_date: string;
    payment_method: string | null;
    reference_number: string | null;
    apartments: { unit_number: string } | null;
    charges: {
      period_month: number;
      period_year: number;
      fee_types: { name: string } | null;
    } | null;
  };

  const filtered = (payments || []) as PaymentRow[];

  const headers = [
    "Apartment",
    "Fee Type",
    "Amount",
    "Payment Date",
    "Payment Method",
    "Reference",
    "Period",
  ];
  const csvLines = [
    headers.join(","),
    ...filtered.map((p: PaymentRow) =>
      [
        escapeCsvCell(p.apartments?.unit_number || "N/A"),
        escapeCsvCell(p.charges?.fee_types?.name || "N/A"),
        p.amount,
        escapeCsvCell(p.payment_date),
        escapeCsvCell(p.payment_method || ""),
        escapeCsvCell(p.reference_number || ""),
        escapeCsvCell(`${p.charges?.period_month}/${p.charges?.period_year}`),
      ].join(",")
    ),
  ];

  return { error: null, data: csvLines.join("\n") };
}
