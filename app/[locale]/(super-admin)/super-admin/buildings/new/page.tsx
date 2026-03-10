import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreateBuildingForm } from "@/components/super-admin/create-building-form";

export default async function NewBuildingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("superAdmin.createBuilding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <CreateBuildingForm />
    </div>
  );
}
