import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Upload, XCircle, ArrowRight } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils/date";
import ReservationStatusBadge from "@/components/shared/reservation-status-badge";

export default async function MyReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.reservations");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch upcoming reservations
  const { data: upcomingReservations } = await supabase
    .from("reservations")
    .select(`
      *,
      space:spaces (
        name,
        photo_url,
        building:buildings (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["confirmed", "payment_submitted", "pending_payment"])
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  // Fetch past reservations
  const { data: pastReservations } = await supabase
    .from("reservations")
    .select(`
      *,
      space:spaces (
        name,
        photo_url,
        building:buildings (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .or(`status.eq.completed,status.eq.cancelled,status.eq.rejected,date.lt.${today}`)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(20);

  // Fetch all reservations for "All" tab
  const { data: allReservations } = await supabase
    .from("reservations")
    .select(`
      *,
      space:spaces (
        name,
        photo_url,
        building:buildings (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(50);

  const renderReservationCard = (reservation: any) => {
    const canUploadProof = reservation.status === "pending_payment";
    const canCancel =
      reservation.status === "pending_payment" ||
      reservation.status === "payment_submitted";

    return (
      <Card key={reservation.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Photo */}
            {reservation.space?.photo_url && (
              <img
                src={reservation.space.photo_url}
                alt={reservation.space.name}
                className="w-24 h-24 rounded object-cover"
              />
            )}

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-lg truncate">
                    {reservation.space?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {reservation.space?.building?.name}
                  </p>
                </div>
                <ReservationStatusBadge status={reservation.status} />
              </div>

              <div className="grid gap-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(reservation.date, locale)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(reservation.start_time)} -{" "}
                    {formatTime(reservation.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">
                    {reservation.reference_code}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}/portal/reservations/${reservation.id}`}>
                    {t("view_details")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {canUploadProof && (
                  <Button asChild size="sm" variant="default">
                    <Link href={`/${locale}/portal/reservations/${reservation.id}#payment`}>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("upload_proof")}
                    </Link>
                  </Button>
                )}

                {canCancel && (
                  <Button asChild size="sm" variant="destructive">
                    <Link href={`/${locale}/portal/reservations/${reservation.id}#cancel`}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t("cancel")}
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
            {upcomingReservations && upcomingReservations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingReservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">{t("tabs.past")}</TabsTrigger>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingReservations && upcomingReservations.length > 0 ? (
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
          {pastReservations && pastReservations.length > 0 ? (
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
          {allReservations && allReservations.length > 0 ? (
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
