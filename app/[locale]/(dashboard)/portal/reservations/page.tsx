import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Upload, ArrowRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/date";
import ReservationStatusBadge from "@/components/shared/reservation-status-badge";
import { createClient } from "@/lib/supabase/server";
import { getMyReservations } from "@/lib/actions/reservations";
import { assertCurrentUserHasModule } from "@/lib/modules";
import type { Reservation } from "@/types";

type ReservationRow = Reservation & {
  public_spaces: { id: string; name: string; photos: string[] | null } | null;
};

export default async function MyReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("reservations");
  const t = await getTranslations("portal.reservations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [upcomingResult, pastResult, allResult] = await Promise.all([
    getMyReservations("upcoming"),
    getMyReservations("past"),
    getMyReservations("all"),
  ]);

  const upcomingReservations = (upcomingResult.data ?? []) as ReservationRow[];
  const pastReservations = (pastResult.data ?? []) as ReservationRow[];
  const allReservations = (allResult.data ?? []) as ReservationRow[];

  const renderReservationCard = (reservation: ReservationRow) => {
    const canUploadProof = reservation.status === "pending_payment";
    const photo = reservation.public_spaces?.photos?.[0] ?? null;

    return (
      <Card key={reservation.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {photo && (
              <img
                src={photo}
                alt={reservation.public_spaces?.name ?? ""}
                className="w-24 h-24 rounded object-cover"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-lg truncate">
                    {reservation.public_spaces?.name ?? "—"}
                  </h3>
                </div>
                <ReservationStatusBadge status={reservation.status} />
              </div>

              <div className="grid gap-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(reservation.start_time, locale)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(reservation.start_time, locale)} -{" "}
                    {formatTime(reservation.end_time, locale)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">
                    {reservation.reference_code}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}/portal/reservations/${reservation.id}`}>
                    {t("view_details")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {canUploadProof && (
                  <Button asChild size="sm" variant="default">
                    <Link
                      href={`/${locale}/portal/reservations/${reservation.id}#payment`}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {t("upload_proof")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/portal/spaces`}>
            <Calendar className="mr-2 h-5 w-5" />
            {t("new_reservation")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            {t("tabs.upcoming")}{" "}
            {upcomingReservations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingReservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">{t("tabs.past")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingReservations.length > 0 ? (
            upcomingReservations.map(renderReservationCard)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_upcoming")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {t("no_upcoming_description")}
                </p>
                <Button asChild>
                  <Link href={`/${locale}/portal/spaces`}>
                    {t("browse_spaces")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastReservations.length > 0 ? (
            pastReservations.map(renderReservationCard)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("no_past")}</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("no_past_description")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allReservations.length > 0 ? (
            allReservations.map(renderReservationCard)
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("no_reservations")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {t("no_reservations_description")}
                </p>
                <Button asChild>
                  <Link href={`/${locale}/portal/spaces`}>
                    {t("make_first_reservation")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
