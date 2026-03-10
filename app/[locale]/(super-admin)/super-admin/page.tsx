import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllBuildings } from "@/lib/actions/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BuildingCard } from "@/components/super-admin/building-card";
import Link from "next/link";
import { Building2, Users, ShieldCheck, Plus } from "lucide-react";
import type { BuildingWithStats } from "@/types";

export default async function SuperAdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("superAdmin.dashboard");
  const tBuildings = await getTranslations("superAdmin.buildings");

  const { data: buildings = [] } = await getAllBuildings();

  const buildingList = (buildings ?? []) as BuildingWithStats[];

  const totalBuildings = buildingList.length;
  const totalUsers = buildingList.reduce((sum, b) => sum + b.user_count, 0);
  const totalAdmins = buildingList.reduce((sum, b) => sum + b.admin_count, 0);

  const stats = [
    {
      title: t("totalBuildings"),
      value: totalBuildings,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: t("totalUsers"),
      value: totalUsers,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: t("totalAdmins"),
      value: totalAdmins,
      icon: ShieldCheck,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/super-admin/buildings/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {tBuildings("new")}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Buildings section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("recentBuildings")}</h2>

        {buildingList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">{t("noBuildings")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("createFirst")}
            </p>
            <Button asChild>
              <Link href={`/${locale}/super-admin/buildings/new`}>
                <Plus className="h-4 w-4 mr-2" />
                {tBuildings("new")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildingList.map((building) => (
              <BuildingCard key={building.id} building={building} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
