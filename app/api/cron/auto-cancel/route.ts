import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Only consider buildings with the reservations module enabled.
  const { data: enabledBuildings } = await supabase
    .from("buildings")
    .select("id")
    .contains("enabled_modules", ["reservations"]);

  const buildingIds = (enabledBuildings ?? []).map((b) => b.id);
  if (buildingIds.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  // Find expired pending_payment reservations in those buildings
  const { data: expired, error: fetchError } = await supabase
    .from("reservations")
    .select("id, user_id, reference_code")
    .in("building_id", buildingIds)
    .eq("status", "pending_payment")
    .lt("payment_deadline", new Date().toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  // Cancel them
  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancellation_reason: "Payment deadline exceeded",
    })
    .in("id", expired.map(r => r.id));

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ cancelled: expired.length });
}
