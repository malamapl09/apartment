import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaintenanceRequestForm } from "@/components/portal/maintenance-request-form";
import { ArrowLeft } from "lucide-react";
import { assertCurrentUserHasModule } from "@/lib/modules";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewMaintenanceRequestPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("maintenance");
  const t = await getTranslations("portal.maintenance");

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/portal/maintenance`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("newRequest")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("submitRequest")}</CardTitle>
          <CardDescription>
            Fill in the details below to submit a maintenance request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceRequestForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
