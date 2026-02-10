import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Users, Calendar, CreditCard } from "lucide-react";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");

  const supabase = await createClient();

  // Fetch counts
  const { count: apartmentCount } = await supabase
    .from("apartments")
    .select("*", { count: "exact", head: true });

  const { count: ownerCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "owner");

  const { count: upcomingReservationsCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .in("status", ["confirmed", "payment_submitted"])
    .gt("start_time", new Date().toISOString());

  const { count: pendingPaymentsCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("status", "payment_submitted");

  const stats = [
    {
      title: t("stats.apartments"),
      value: apartmentCount || 0,
      icon: Building2,
      href: `/${locale}/admin/apartments`,
      color: "text-blue-600",
    },
    {
      title: t("stats.owners"),
      value: ownerCount || 0,
      icon: Users,
      href: `/${locale}/admin/owners`,
      color: "text-green-600",
    },
    {
      title: t("stats.upcomingReservations"),
      value: upcomingReservationsCount || 0,
      icon: Calendar,
      href: `/${locale}/admin/reservations`,
      color: "text-purple-600",
    },
    {
      title: t("stats.pendingPayments"),
      value: pendingPaymentsCount || 0,
      icon: CreditCard,
      href: `/${locale}/admin/payments`,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("description")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <Link href={stat.href}>
                  <Button variant="link" className="px-0 text-xs mt-1">
                    {t("viewAll")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickActions.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href={`/${locale}/admin/apartments/new`}>
            <Button variant="outline" className="w-full">
              <Building2 className="mr-2 h-4 w-4" />
              {t("quickActions.newApartment")}
            </Button>
          </Link>
          <Link href={`/${locale}/admin/owners/invite`}>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              {t("quickActions.inviteOwner")}
            </Button>
          </Link>
          <Link href={`/${locale}/admin/reservations`}>
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              {t("quickActions.manageReservations")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
