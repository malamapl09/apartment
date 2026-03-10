"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText } from "lucide-react";
import type { DocumentWithUploader, DocumentCategory } from "@/types";
import { format } from "date-fns";

interface DocumentBrowserProps {
  documents: DocumentWithUploader[];
}

const categoryVariantMap: Record<DocumentCategory, "default" | "secondary" | "outline" | "destructive"> = {
  rules: "default",
  minutes: "secondary",
  contracts: "destructive",
  notices: "outline",
  forms: "secondary",
};

export function DocumentBrowser({ documents }: DocumentBrowserProps) {
  const t = useTranslations("portal.documents");

  const categories = ["all", "rules", "minutes", "contracts", "notices", "forms"] as const;

  const getFiltered = (category: string) => {
    if (category === "all") return documents;
    return documents.filter((doc) => doc.category === category);
  };

  const renderDocumentCard = (doc: DocumentWithUploader) => (
    <Card key={doc.id} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {doc.title}
            </CardTitle>
            {doc.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {doc.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={categoryVariantMap[doc.category]}>
            {t(`categories.${doc.category}`)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("version", { version: doc.version })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("uploadedOn", {
            date: format(new Date(doc.created_at), "dd MMM yyyy"),
          })}
        </p>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download={doc.file_name}>
            <Download className="mr-2 h-4 w-4" />
            {t("download")}
          </a>
        </Button>
      </CardFooter>
    </Card>
  );

  const renderEmpty = () => (
    <div className="col-span-full text-center py-16">
      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-1">{t("noDocuments")}</h3>
      <p className="text-sm text-muted-foreground">{t("noDocumentsDescription")}</p>
    </div>
  );

  return (
    <Tabs defaultValue="all">
      <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {t(`categories.${cat}`)}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((cat) => {
        const filtered = getFiltered(cat);
        return (
          <TabsContent key={cat} value={cat}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.length === 0 ? renderEmpty() : filtered.map(renderDocumentCard)}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
