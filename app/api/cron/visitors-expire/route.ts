import { createAdminClient } from "@/lib/supabase/admin";
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

  // Only operate on buildings where the visitors module is enabled.
  const { data: enabledBuildings, error: buildingsError } = await supabase
    .from("buildings")
    .select("id")
    .contains("enabled_modules", ["visitors"]);

  if (buildingsError) {
    return NextResponse.json({ error: buildingsError.message }, { status: 500 });
  }

  const buildingIds = (enabledBuildings ?? []).map((b) => b.id);
  if (buildingIds.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  // Flip any past-window visitors that are still "expected" to "expired".
  const { data: expired, error: updateError } = await supabase
    .from("visitors")
    .update({ status: "expired" })
    .eq("status", "expected")
    .lt("valid_until", new Date().toISOString())
    .in("building_id", buildingIds)
    .select("id");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ expired: expired?.length ?? 0 });
}
