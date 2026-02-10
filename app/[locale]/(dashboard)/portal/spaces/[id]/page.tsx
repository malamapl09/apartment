import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Users, DollarSign, Clock, Shield, Calendar, Info, ArrowRight, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.space_detail");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch space
  const { data: space, error } = await supabase
    .from("spaces")
    .select(`
      *,
      building:buildings (
        id,
        name,
        currency
      )
    `)
    .eq("id", id)
    .single();

  if (error || !space) {
    notFound();
  }

  // Fetch availability schedules
  const { data: schedules } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("space_id", id)
    .order("day_of_week");

  // Fetch blackout dates
  const { data: blackouts } = await supabase
    .from("blackout_dates")
    .select("*")
    .eq("space_id", id)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date");

  const dayNames = [
    t("days.sunday"),
    t("days.monday"),
    t("days.tuesday"),
    t("days.wednesday"),
    t("days.thursday"),
    t("days.friday"),
    t("days.saturday"),
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{space.name}</h1>
          <p className="text-muted-foreground mt-2">{space.building?.name}</p>
        </div>
        {space.is_free && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {t("free")}
          </Badge>
        )}
      </div>

      {/* Photo Gallery */}
      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
        {space.photo_url ? (
          <img
            src={space.photo_url}
            alt={space.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t("about")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{space.description}</p>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Capacity & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("capacity")}</span>
              </div>
              <span className="text-sm">
                {space.capacity} {t("people")}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("hourly_rate")}</span>
              </div>
              <span className="text-sm font-semibold">
                {space.is_free
                  ? t("free_of_charge")
                  : formatCurrency(space.hourly_rate, space.building?.currency || "USD")}
              </span>
            </div>

            {!space.is_free && space.deposit_amount > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("deposit")}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(space.deposit_amount, space.building?.currency || "USD")}
                  </span>
                </div>
              </>
            )}

            {space.max_duration_hours && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("max_duration")}</span>
                  </div>
                  <span className="text-sm">{space.max_duration_hours} {t("hours")}</span>
                </div>
              </>
            )}

            {space.gap_between_bookings_minutes > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("gap_between")}</span>
                  </div>
                  <span className="text-sm">{space.gap_between_bookings_minutes} {t("minutes")}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rules */}
        {space.rules && (
          <Card>
            <CardHeader>
              <CardTitle>{t("rules")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{space.rules}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Availability Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("availability_schedule")}
          </CardTitle>
          <CardDescription>{t("availability_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("day")}</TableHead>
                  <TableHead>{t("hours")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {dayNames[schedule.day_of_week]}
                    </TableCell>
                    <TableCell>
                      {schedule.start_time} - {schedule.end_time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("no_schedule")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Blackout Dates */}
      {blackouts && blackouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("blackout_dates")}</CardTitle>
            <CardDescription>{t("blackout_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blackouts.map((blackout) => (
                <div key={blackout.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm font-medium">{blackout.date}</span>
                  {blackout.reason && (
                    <span className="text-sm text-muted-foreground">{blackout.reason}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {space.is_active && (
        <div className="flex justify-center">
          <Button asChild size="lg" className="min-w-64">
            <Link href={`/${locale}/portal/reservations/new/${space.id}`}>
              <Calendar className="mr-2 h-5 w-5" />
              {t("reserve_this_space")} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
