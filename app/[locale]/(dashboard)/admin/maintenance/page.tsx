import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getMaintenanceRequests, getMaintenanceStats } from "@/lib/actions/admin-maintenance";
import { MaintenanceTable } from "@/components/admin/maintenance-table";
import { MaintenanceFilters } from "@/components/admin/maintenance-filters";
import { RealtimeRefreshWrapper } from "@/components/admin/realtime-refresh-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Clock, CheckCircle2 } from "lucide-react";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { assertCurrentUserHasModule } from "@/lib/modules";

const PER_PAGE = 25;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function AdminMaintenancePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("maintenance");
  const t = await getTranslations("admin.maintenance");
  const page = Math.max(1, parseInt(filters.page ?? "1", 10) || 1);

  const [{ data: requests, error, total }, { data: stats }] = await Promise.all([
    getMaintenanceRequests({
      status: filters.status,
      priority: filters.priority,
      category: filters.category,
      page,
      per_page: PER_PAGE,
    }),
    getMaintenanceStats(),
  ]);

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              {t("noRequests")}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <RealtimeRefreshWrapper watchMaintenance>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("stats.open")}
                  </p>
                  <p className="text-2xl font-bold">{stats.open}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("stats.inProgress")}
                  </p>
                  <p className="text-2xl font-bold">{stats.in_progress}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("stats.resolved")}
                  </p>
                  <p className="text-2xl font-bold">{stats.resolved}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t("filters.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
              <MaintenanceFilters />
            </Suspense>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MaintenanceTable
              requests={requests ?? []}
              locale={locale}
            />
            <PaginationControls total={total ?? 0} page={page} perPage={PER_PAGE} />
          </CardContent>
        </Card>
      </div>
    </RealtimeRefreshWrapper>
  );
}
