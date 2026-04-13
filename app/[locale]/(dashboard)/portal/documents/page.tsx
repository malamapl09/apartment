import { setRequestLocale, getTranslations } from "next-intl/server";
import { getDocuments } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/server";
import { DocumentBrowser } from "@/components/portal/document-browser";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { DocumentWithUploader } from "@/types";
import { assertCurrentUserHasModule } from "@/lib/modules";

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("documents");
  const t = await getTranslations("portal.documents");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: documents, error }, acksResult] = await Promise.all([
    getDocuments(),
    user
      ? supabase
          .from("document_acknowledgments")
          .select("document_id")
          .eq("profile_id", user.id)
      : Promise.resolve({ data: [] as { document_id: string }[] }),
  ]);

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
  const myAcknowledgedIds = (acksResult.data ?? []).map(
    (a: { document_id: string }) => a.document_id,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <DocumentBrowser
        documents={allDocuments}
        myAcknowledgedIds={myAcknowledgedIds}
      />
    </div>
  );
}
