import { setRequestLocale, getTranslations } from "next-intl/server";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DocumentUploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.documents");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("upload")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("upload")}</CardTitle>
          <CardDescription>
            Fill in the details and select a file to upload to the building&apos;s document library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
