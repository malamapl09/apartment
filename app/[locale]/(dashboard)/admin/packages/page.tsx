import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPackages, getPackageStats } from "@/lib/actions/admin-packages";
import { createClient } from "@/lib/supabase/server";
import { PackageTable } from "@/components/admin/package-table";
import { PackageLogForm } from "@/components/admin/package-log-form";
import { RealtimeRefreshWrapper } from "@/components/admin/realtime-refresh-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, AlertCircle, Clock, Bell, CheckCircle } from "lucide-react";
import type { PackageWithDetails } from "@/types";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    apartment_id?: string;
  }>;
}

export default async function AdminPackagesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.packages");
  const resolvedSearchParams = await searchParams;

  const filters = {
    status: resolvedSearchParams.status,
    apartment_id: resolvedSearchParams.apartment_id,
  };

  const supabase = await createClient();

  const [packagesResult, statsResult, apartmentsResult] = await Promise.all([
    getPackages(filters),
    getPackageStats(),
    supabase
      .from("apartments")
      .select("id, unit_number")
      .order("unit_number", { ascending: true }),
  ]);

  if (packagesResult.error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{packagesResult.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const packages = (packagesResult.data ?? []) as PackageWithDetails[];
  const stats = statsResult.data ?? { pending: 0, notified: 0, picked_up: 0 };
  const apartments = (apartmentsResult.data ?? []) as {
    id: string;
    unit_number: string;
  }[];

  return (
    <RealtimeRefreshWrapper>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <PackageLogForm apartments={apartments} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.pending")}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.notified")}
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("stats.pickedUp")}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.picked_up}</div>
            </CardContent>
          </Card>
        </div>

        {/* All Packages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
              </div>
              <Badge variant="outline">{packages.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noPackages")}</p>
            ) : (
              <PackageTable packages={packages} />
            )}
          </CardContent>
        </Card>
      </div>
    </RealtimeRefreshWrapper>
  );
}
