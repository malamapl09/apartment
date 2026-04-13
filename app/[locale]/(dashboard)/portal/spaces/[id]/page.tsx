import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Users, DollarSign, Clock, Shield, Calendar, Info, ArrowRight, Image as ImageIcon, Activity, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date";
import ActivityCancelButton from "@/components/portal/activity-cancel-button";
import { assertCurrentUserHasModule } from "@/lib/modules";
import type { BankAccountInfo } from "@/types";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("reservations");
  const t = await getTranslations("portal.space_detail");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch space + the building's bank info so we can show residents where
  // they'll transfer funds BEFORE they commit to a reservation.
  const { data: space, error } = await supabase
    .from("public_spaces")
    .select(`
      *,
      buildings (
        id,
        name,
        bank_account_info
      )
    `)
    .eq("id", id)
    .single();

  if (error || !space) {
    notFound();
  }

  const isFree = space.hourly_rate === 0 && space.deposit_amount === 0;
  const firstPhoto = space.photos?.[0];
  const bankInfo = (space.buildings?.bank_account_info ?? null) as BankAccountInfo | null;

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

  // Fetch upcoming activities
  const { data: upcomingActivities } = await supabase
    .from("space_activities")
    .select("*, profiles!user_id(id, full_name)")
    .eq("space_id", id)
    .eq("status", "active")
    .gte("end_time", new Date().toISOString())
    .order("start_time")
    .limit(20);

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
          <p className="text-muted-foreground mt-2">{space.buildings?.name}</p>
        </div>
        {isFree && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {t("free")}
          </Badge>
        )}
      </div>

      {/* Photo Gallery */}
      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
        {firstPhoto ? (
          <img
            src={firstPhoto}
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
      {space.description && (
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
      )}

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
                <span className="text-sm font-medium">
                  {t(`rate_label.${space.pricing_type ?? "hourly"}`)}
                </span>
              </div>
              <span className="text-sm font-semibold">
                {isFree
                  ? t("free_of_charge")
                  : formatCurrency(space.hourly_rate, "USD")}
              </span>
            </div>

            {!isFree && space.deposit_amount > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("deposit")}</span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(space.deposit_amount, "USD")}
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

            {space.gap_minutes > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("gap_between")}</span>
                  </div>
                  <span className="text-sm">{space.gap_minutes} {t("minutes")}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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

      {/* Upcoming Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("upcoming_activities")}
          </CardTitle>
          <CardDescription>{t("upcoming_activities_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingActivities && upcomingActivities.length > 0 ? (
            <div className="space-y-3">
              {upcomingActivities.map((activity) => {
                const start = new Date(activity.start_time);
                const end = new Date(activity.end_time);
                const timeStr = `${start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
                const dateStr = start.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
                const isOwner = activity.user_id === user.id;

                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateStr} · {timeStr}
                        {activity.profiles && ` · ${activity.profiles.full_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                        {t("activity_badge")}
                      </Badge>
                      <ActivityCancelButton
                        activityId={activity.id}
                        recurrenceGroupId={activity.recurrence_group_id ?? null}
                        isOwner={isOwner}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("no_activities")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Information — so residents see where funds will be
          transferred before they even click "Reserve". Only relevant for
          paid spaces. */}
      {!isFree && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("paymentInfo.title")}
            </CardTitle>
            <CardDescription>{t("paymentInfo.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {bankInfo ? (
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {bankInfo.bank_name && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t("paymentInfo.bankName")}
                    </span>
                    <span className="font-medium">{bankInfo.bank_name}</span>
                  </div>
                )}
                {bankInfo.holder_name && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t("paymentInfo.accountHolder")}
                    </span>
                    <span className="font-medium">{bankInfo.holder_name}</span>
                  </div>
                )}
                {bankInfo.account_number && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t("paymentInfo.accountNumber")}
                    </span>
                    <span className="font-mono font-medium">
                      {bankInfo.account_number}
                    </span>
                  </div>
                )}
                {bankInfo.account_type && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {t("paymentInfo.accountType")}
                    </span>
                    <span className="font-medium">{bankInfo.account_type}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("paymentInfo.missing")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {space.is_active && space.allow_reservations !== false && (
        <div className="flex justify-center">
          <Button asChild size="lg" className="min-w-64">
            <Link href={`/${locale}/portal/reservations/new/${space.id}`}>
              <Calendar className="mr-2 h-5 w-5" />
              {t("reserve_this_space")} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      )}

      {space.is_active && space.allow_reservations === false && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Badge variant="secondary" className="text-sm px-4 py-1.5">
            {t("activities_only")}
          </Badge>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t("activities_only_description")}
          </p>
        </div>
      )}
    </div>
  );
}
