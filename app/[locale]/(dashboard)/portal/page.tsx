import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Home, Bell, ArrowRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/date";
import ReservationStatusBadge from "@/components/shared/reservation-status-badge";
import { getPortalSummary } from "@/lib/actions/analytics";
import { getAuthProfile } from "@/lib/actions/helpers";
import { getMyReservations } from "@/lib/actions/reservations";
import { isModuleEnabled } from "@/lib/modules";
import PortalSummaryCards from "@/components/portal/summary-cards";

export default async function PortalDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal");

  const { user, profile: authProfile } = await getAuthProfile();
  if (!user || !authProfile) {
    redirect(`/${locale}/login`);
  }
  const enabledModules = authProfile.enabled_modules;
  const hasReservations = isModuleEnabled(enabledModules, "reservations");

  const supabase = await createClient();

  // Fetch user profile with apartment info. apartments table uses
  // `unit_number`, not `apartment_number`; building info comes from a
  // separate fetch below since the join here returned an empty shape
  // historically.
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      apartment_owners (
        apartment_id,
        apartments (
          unit_number,
          building:buildings (
            id,
            name
          )
        )
      )
    `)
    .eq("id", user.id)
    .single();

  // Fetch upcoming reservations (top 5) — only if the module is enabled.
  // getMyReservations returns rows with `public_spaces (id, name, photos)`.
  const upcomingReservations = hasReservations
    ? ((await getMyReservations("upcoming")).data ?? []).slice(0, 5)
    : null;

  // Fetch recent announcements (top 3). The announcements table has no
  // `published` column — published_at being non-null is the convention.
  // expires_at filter keeps already-expired notices out.
  const buildingId = authProfile.building_id;
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("building_id", buildingId)
    .not("published_at", "is", null)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order("published_at", { ascending: false })
    .limit(3);

  const apartmentInfo = profile?.apartment_owners?.[0]?.apartments;
  const buildingInfo = apartmentInfo?.building;

  // Fetch portal summary
  const summaryResult = await getPortalSummary();
  const summary = summaryResult.data;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("welcome")}, {profile?.full_name || user.email}
        </h1>
        {apartmentInfo && (
          <p className="text-muted-foreground mt-2">
            <Home className="inline h-4 w-4 mr-1" />
            {buildingInfo?.name} - {t("apartment")} {apartmentInfo.unit_number}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <PortalSummaryCards data={summary} locale={locale} />
      )}

      {/* Quick Actions — only show reservations CTAs when the module is on */}
      {hasReservations && (
        <Card>
          <CardHeader>
            <CardTitle>{t("quick_actions")}</CardTitle>
            <CardDescription>{t("quick_actions_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild size="lg" className="h-auto flex-col items-start p-6">
                <Link href={`/${locale}/portal/spaces`}>
                  <Calendar className="h-6 w-6 mb-2" />
                  <span className="text-lg font-semibold">{t("reserve_space")}</span>
                  <span className="text-sm font-normal opacity-90">{t("reserve_space_description")}</span>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-auto flex-col items-start p-6">
                <Link href={`/${locale}/portal/reservations`}>
                  <Calendar className="h-6 w-6 mb-2" />
                  <span className="text-lg font-semibold">{t("my_reservations")}</span>
                  <span className="text-sm font-normal opacity-90">{t("my_reservations_description")}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Reservations — only when the module is enabled */}
      {hasReservations && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("upcoming_reservations")}</CardTitle>
              <CardDescription>{t("upcoming_reservations_description")}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${locale}/portal/reservations`}>
                {t("view_all")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingReservations && upcomingReservations.length > 0 ? (
            <div className="space-y-4">
              {upcomingReservations.map((reservation) => (
                <Link
                  key={reservation.id}
                  href={`/${locale}/portal/reservations/${reservation.id}`}
                  className="block"
                >
                  <div className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors">
                    {reservation.public_spaces?.photos?.[0] && (
                      <img
                        src={reservation.public_spaces.photos[0]}
                        alt={reservation.public_spaces.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold truncate">{reservation.public_spaces?.name ?? "—"}</h4>
                        <ReservationStatusBadge status={reservation.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(reservation.start_time, locale)} • {formatTime(reservation.start_time, locale)} - {formatTime(reservation.end_time, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("reference")}: {reservation.reference_code}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("no_upcoming_reservations")}</p>
              <Button asChild className="mt-4">
                <Link href={`/${locale}/portal/spaces`}>{t("browse_spaces")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>{t("announcements")}</CardTitle>
            </div>
            <CardDescription>{t("announcements_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{announcement.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {announcement.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {announcement.published_at &&
                          formatDate(announcement.published_at, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
