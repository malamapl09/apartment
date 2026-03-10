import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Plus, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDocuments, deleteDocument } from "@/lib/actions/documents";
import { DocumentTable } from "@/components/admin/document-table";
import type { DocumentWithUploader } from "@/types";

export default async function AdminDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.documents");

  const { data: documents, error } = await getDocuments();

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const allDocuments = (documents as DocumentWithUploader[]) ?? [];

  const categories = ["all", "rules", "minutes", "contracts", "notices", "forms"] as const;

  const getFilteredDocuments = (category: string) => {
    if (category === "all") return allDocuments;
    return allDocuments.filter((doc) => doc.category === category);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/documents/upload`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("upload")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat === "all" ? t("filters.allCategories") : t(`categories.${cat}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => {
          const filtered = getFilteredDocuments(cat);
          return (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {cat === "all" ? t("title") : t(`categories.${cat}`)}
                  </CardTitle>
                  <CardDescription>{t("description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">
                        {t("noDocuments")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("noDocumentsDescription")}
                      </p>
                      <Button asChild className="mt-4" variant="outline">
                        <Link href={`/${locale}/admin/documents/upload`}>
                          {t("upload")}
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <DocumentTable
                      documents={filtered}
                      onDelete={deleteDocument}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
