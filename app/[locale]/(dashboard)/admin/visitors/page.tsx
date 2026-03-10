import { getTranslations } from "next-intl/server";
import { getAllVisitors, getTodaysVisitors } from "@/lib/actions/admin-visitors";
import { VisitorTable } from "@/components/admin/visitor-table";
import { VisitorLookup } from "@/components/admin/visitor-lookup";
import { RealtimeRefreshWrapper } from "@/components/admin/realtime-refresh-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, AlertCircle, Search } from "lucide-react";
import type { VisitorWithDetails } from "@/types";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    date?: string;
    apartment_id?: string;
  }>;
}

export default async function AdminVisitorsPage({ searchParams }: PageProps) {
  const t = await getTranslations("admin.visitors");
  const params = await searchParams;

  const filters = {
    status: params.status,
    date: params.date,
    apartment_id: params.apartment_id,
  };

  const [visitorsResult, todaysResult] = await Promise.all([
    getAllVisitors(filters),
    getTodaysVisitors(),
  ]);

  if (visitorsResult.error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{visitorsResult.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const visitors = (visitorsResult.data ?? []) as VisitorWithDetails[];
  const todaysVisitors = (todaysResult.data ?? []) as VisitorWithDetails[];

  return (
    <RealtimeRefreshWrapper watchVisitors>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        {/* Expected Today */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("todayExpected")}
              </CardTitle>
              <Badge variant="secondary" className="text-sm">
                {todaysVisitors.length}
              </Badge>
            </div>
          </CardHeader>
          {todaysVisitors.length > 0 && (
            <CardContent>
              <VisitorTable visitors={todaysVisitors} />
            </CardContent>
          )}
        </Card>

        {/* Lookup by Access Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t("lookup")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VisitorLookup />
          </CardContent>
        </Card>

        {/* All Visitors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
              </div>
              <Badge variant="outline">{visitors.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <VisitorTable visitors={visitors} />
          </CardContent>
        </Card>
      </div>
    </RealtimeRefreshWrapper>
  );
}
