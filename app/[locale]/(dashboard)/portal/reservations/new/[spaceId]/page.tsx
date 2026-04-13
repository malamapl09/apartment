import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import BookingFlow from "@/components/portal/booking-flow";
import RestrictionBanner from "@/components/portal/restriction-banner";
import { getMyActiveRestrictions } from "@/lib/actions/user-restrictions-portal";
import type { UserRestriction } from "@/types";
import { assertCurrentUserHasModule } from "@/lib/modules";

export default async function NewReservationPage({
  params,
}: {
  params: Promise<{ locale: string; spaceId: string }>;
}) {
  const { locale, spaceId } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("reservations");
  const t = await getTranslations("portal.booking");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch space with building info
  const { data: space, error: spaceError } = await supabase
    .from("public_spaces")
    .select(`
      *,
      buildings (
        id,
        name
      )
    `)
    .eq("id", spaceId)
    .eq("is_active", true)
    .single();

  if (spaceError || !space) {
    notFound();
  }

  if (space.allow_reservations === false) {
    redirect(`/${locale}/portal/spaces/${spaceId}`);
  }

  // Fetch availability schedules
  const { data: schedules } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("space_id", spaceId)
    .order("day_of_week");

  // Fetch blackout dates (future only)
  const { data: blackouts } = await supabase
    .from("blackout_dates")
    .select("*")
    .eq("space_id", spaceId)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date");

  // Fetch this user's active restrictions (for the banner)
  const { data: restrictions } = await getMyActiveRestrictions();

  // Fetch building bank info (for payment instructions)
  const { data: building } = await supabase
    .from("buildings")
    .select("bank_account_info")
    .eq("id", space.buildings?.id)
    .single();

  const bankAccountInfo = building?.bank_account_info as {
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    holder_name?: string;
  } | null;

  const formattedBankInfo = bankAccountInfo
    ? {
        account_name: bankAccountInfo.holder_name || "",
        account_number: bankAccountInfo.account_number || "",
        bank_name: bankAccountInfo.bank_name || "",
      }
    : undefined;

  // Map to the shape BookingFlow expects (with building.currency)
  const spaceWithBuilding = {
    ...space,
    building: space.buildings
      ? { id: space.buildings.id, name: space.buildings.name }
      : undefined,
  };

  const typedRestrictions = (restrictions ?? []) as (UserRestriction & {
    public_spaces: { id: string; name: string } | null;
  })[];

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("booking_for")} {space.name}
          </p>
        </div>

        <RestrictionBanner
          restrictions={typedRestrictions}
          currentSpaceId={spaceId}
        />
      </div>

      <BookingFlow
        space={spaceWithBuilding}
        schedules={schedules || []}
        blackouts={blackouts || []}
        bankInfo={formattedBankInfo}
      />
    </div>
  );
}
