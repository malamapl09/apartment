import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAuditLogs, getAuditUsers } from "@/lib/actions/admin-audit";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { AuditFilters } from "@/components/admin/audit-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    action?: string;
    table_name?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
  }>;
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.audit");

  const page = filters.page ? parseInt(filters.page, 10) : 1;

  const [{ data: logs, total, error }, { data: users }] = await Promise.all([
    getAuditLogs({
      action: filters.action,
      table_name: filters.table_name,
      user_id: filters.user_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      page,
      per_page: 25,
    }),
    getAuditUsers(),
  ]);

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("title")}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t("filters.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <AuditFilters users={users ?? []} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable
            logs={logs ?? []}
            total={total ?? 0}
            page={page}
            perPage={25}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  );
}
