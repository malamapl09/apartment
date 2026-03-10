import { setRequestLocale, getTranslations } from "next-intl/server";
import { BulkImportForm } from "@/components/admin/bulk-import-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ImportOwnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.owners");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/admin/owners`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("import.pageTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("import.pageDescription")}
          </p>
        </div>
      </div>

      <BulkImportForm />
    </div>
  );
}
