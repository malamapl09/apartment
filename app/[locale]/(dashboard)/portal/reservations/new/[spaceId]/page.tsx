import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import BookingFlow from "@/components/portal/booking-flow";

export default async function NewReservationPage({
  params,
}: {
  params: Promise<{ locale: string; spaceId: string }>;
}) {
  const { locale, spaceId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.booking");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch space with building info
  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select(`
      *,
      building:buildings (
        id,
        name,
        currency
      )
    `)
    .eq("id", spaceId)
    .eq("is_active", true)
    .single();

  if (spaceError || !space) {
    notFound();
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

  // Fetch building bank info (for payment instructions)
  const { data: bankInfo } = await supabase
    .from("buildings")
    .select("bank_account_name, bank_account_number, bank_name, bank_routing_number")
    .eq("id", space.building?.id)
    .single();

  const formattedBankInfo = bankInfo
    ? {
        account_name: bankInfo.bank_account_name,
        account_number: bankInfo.bank_account_number,
        bank_name: bankInfo.bank_name,
        routing_number: bankInfo.bank_routing_number,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("booking_for")} {space.name}
        </p>
      </div>

      <BookingFlow
        space={space}
        schedules={schedules || []}
        blackouts={blackouts || []}
        bankInfo={formattedBankInfo}
      />
    </div>
  );
}
