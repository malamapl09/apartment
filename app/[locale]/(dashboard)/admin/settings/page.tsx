import { getTranslations, setRequestLocale } from "next-intl/server";
import { getBuildingSettings } from "@/lib/actions/building-settings";
import { BuildingSettingsForm } from "@/components/admin/building-settings-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.settings");
  const { data, error } = await getBuildingSettings();

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error || "Failed to load settings"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <BuildingSettingsForm building={data} />
    </div>
  );
}
