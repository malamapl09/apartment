import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/actions/documents";
import { getDocumentAcknowledgmentStatus } from "@/lib/actions/document-acknowledgments";
import { assertCurrentUserHasModule } from "@/lib/modules";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DocumentAcknowledgmentStatus from "@/components/admin/document-acknowledgment-status";
import type { DocumentWithUploader, DocumentAudienceMember } from "@/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminDocumentDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("documents");
  const t = await getTranslations("admin.documents");

  const [docResult, audienceResult] = await Promise.all([
    getDocument(id),
    getDocumentAcknowledgmentStatus(id),
  ]);

  const doc = docResult.data as DocumentWithUploader | null;
  if (!doc) notFound();

  const audience = (audienceResult.data ?? []) as DocumentAudienceMember[];

  // Pull ack timestamps in one query for the audience display.
  let ackTimestamps: Record<string, string> = {};
  if (doc.requires_acknowledgment && audience.length > 0) {
    const supabase = await createClient();
    const { data: acks } = await supabase
      .from("document_acknowledgments")
      .select("profile_id, acknowledged_at")
      .eq("document_id", id);
    ackTimestamps = Object.fromEntries(
      (acks ?? []).map((a) => [a.profile_id, a.acknowledged_at]),
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href={`/${locale}/admin/documents`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("detail.back")}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        {doc.description && (
          <p className="text-muted-foreground mt-2">{doc.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t("detail.metadata")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">{t("category")}</span>
              <div>
                <Badge variant="secondary">
                  {t(`categories.${doc.category}`)}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">{t("target")}</span>
              <div>
                <Badge variant="outline">
                  {doc.target === "all"
                    ? t("targetAll")
                    : doc.target === "owners"
                    ? t("targetOwners")
                    : t("targetResidents")}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">{t("table.version")}</span>
              <div>v{doc.version}</div>
            </div>
            <div>
              <span className="text-muted-foreground">{t("table.uploadedBy")}</span>
              <div>{doc.profiles?.full_name ?? "—"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("detail.acknowledgmentRequired")}
              </span>
              <div>
                <Badge variant={doc.requires_acknowledgment ? "default" : "outline"}>
                  {doc.requires_acknowledgment ? t("detail.yes") : t("detail.no")}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <Button asChild variant="outline" size="sm">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download={doc.file_name}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("table.download")}
            </a>
          </Button>
        </CardContent>
      </Card>

      {doc.requires_acknowledgment && (
        <DocumentAcknowledgmentStatus
          documentId={doc.id}
          audience={audience}
          ackTimestamps={ackTimestamps}
        />
      )}
    </div>
  );
}
