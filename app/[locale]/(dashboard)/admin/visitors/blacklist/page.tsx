import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getBlacklist } from "@/lib/actions/visitor-blacklist";
import { assertCurrentUserHasModule } from "@/lib/modules";
import VisitorBlacklistTable from "@/components/admin/visitor-blacklist-table";
import VisitorBlacklistFormDialog from "@/components/admin/visitor-blacklist-form-dialog";
import type { VisitorBlacklistEntry } from "@/types";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function VisitorBlacklistPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("visitors");
  const t = await getTranslations("admin.visitors.blacklist");

  const { data: entries } = await getBlacklist();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/admin/visitors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <VisitorBlacklistFormDialog />
        </CardHeader>
        <CardContent>
          <VisitorBlacklistTable
            entries={
              (entries ?? []) as (VisitorBlacklistEntry & {
                profiles: { id: string; full_name: string | null } | null;
              })[]
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
