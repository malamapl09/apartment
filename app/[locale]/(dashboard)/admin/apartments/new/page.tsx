import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ApartmentForm } from "@/components/admin/apartment-form";

export default async function NewApartmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.apartments");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("newApartment")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("newApartmentDescription")}
        </p>
      </div>

      <ApartmentForm />
    </div>
  );
}
