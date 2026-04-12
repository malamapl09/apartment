import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify cron secret. Guard against an unset env var (`Bearer undefined`
  // would otherwise match a missing CRON_SECRET on local / misconfigured envs).
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Only act on buildings with the fees module enabled.
  const { data: enabledBuildings } = await supabase
    .from("buildings")
    .select("id")
    .contains("enabled_modules", ["fees"]);

  const buildingIds = (enabledBuildings ?? []).map((b) => b.id);
  if (buildingIds.length === 0) {
    return NextResponse.json({ success: true, markedOverdue: 0 });
  }

  // Find all pending charges past their due date in those buildings
  const { data: overdueCharges, error: fetchError } = await supabase
    .from("charges")
    .select("id, apartment_id, fee_type_id, amount, due_date")
    .in("building_id", buildingIds)
    .eq("status", "pending")
    .lt("due_date", today);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!overdueCharges || overdueCharges.length === 0) {
    return NextResponse.json({ success: true, markedOverdue: 0 });
  }

  // Update all to overdue
  const { error: updateError } = await supabase
    .from("charges")
    .update({ status: "overdue" })
    .in(
      "id",
      overdueCharges.map((c) => c.id)
    );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Collect unique IDs for batch queries
  const feeTypeIds = [...new Set(overdueCharges.map((c) => c.fee_type_id))];
  const apartmentIds = [...new Set(overdueCharges.map((c) => c.apartment_id))];

  // Fetch all fee types in one query
  const { data: feeTypes } = await supabase
    .from("fee_types")
    .select("id, name")
    .in("id", feeTypeIds);

  // Fetch all apartment owners in one query
  const { data: allOwners } = await supabase
    .from("apartment_owners")
    .select("profile_id, apartment_id, apartments (unit_number)")
    .in("apartment_id", apartmentIds);

  // Build lookup maps
  const feeTypeMap = new Map(
    (feeTypes ?? []).map((ft) => [ft.id, ft.name])
  );

  type ApartmentOwnerRow = {
    profile_id: string;
    apartment_id: string;
    apartments: { unit_number: string }[] | null;
  };

  const ownersByApartment = new Map<string, ApartmentOwnerRow[]>();
  for (const owner of (allOwners ?? []) as ApartmentOwnerRow[]) {
    const existing = ownersByApartment.get(owner.apartment_id) ?? [];
    existing.push(owner);
    ownersByApartment.set(owner.apartment_id, existing);
  }

  // Send overdue reminder emails to apartment owners (fire-and-forget)
  for (const charge of overdueCharges) {
    const feeTypeName = feeTypeMap.get(charge.fee_type_id) ?? "Unknown";
    const owners = ownersByApartment.get(charge.apartment_id) ?? [];

    for (const owner of owners) {
      const unitNumber = owner.apartments?.[0]?.unit_number ?? "";
      sendNotificationEmail({
        userId: owner.profile_id,
        type: "overdue_reminders",
        templateProps: {
          amount: String(charge.amount),
          feeType: feeTypeName,
          dueDate: charge.due_date,
          apartmentUnit: unitNumber,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    markedOverdue: overdueCharges.length,
  });
}
