import { getTranslations, setRequestLocale } from "next-intl/server";
import { Package } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getMyPackages } from "@/lib/actions/packages";
import { MyPackagesList } from "@/components/portal/my-packages-list";
import { assertCurrentUserHasModule } from "@/lib/modules";

export default async function PortalPackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("packages");
  const t = await getTranslations("portal.packages");
  const { data: packages, error } = await getMyPackages();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>{t("title")}</CardTitle>
          </div>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <MyPackagesList packages={packages ?? []} />
    </div>
  );
}
