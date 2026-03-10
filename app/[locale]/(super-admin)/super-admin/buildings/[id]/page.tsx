import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBuildingDetail } from "@/lib/actions/super-admin";
import { BuildingDetail } from "@/components/super-admin/building-detail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("superAdmin.buildingDetail");

  const result = await getBuildingDetail(id);

  if (result.error || !result.data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {result.error ?? "Building not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { building, profiles } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <BuildingDetail building={building} profiles={profiles} />
    </div>
  );
}
