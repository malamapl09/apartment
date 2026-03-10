import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllBuildings } from "@/lib/actions/super-admin";
import { BuildingCard } from "@/components/super-admin/building-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import type { BuildingWithStats } from "@/types";

export default async function BuildingsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("superAdmin.buildings");

  const { data: buildings = [] } = await getAllBuildings();
  const buildingList = (buildings ?? []) as BuildingWithStats[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/super-admin/buildings/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {t("new")}
          </Link>
        </Button>
      </div>

      {buildingList.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">{t("noBuildings")}</p>
          <Button asChild>
            <Link href={`/${locale}/super-admin/buildings/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("new")}
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
  );
}
