import { setRequestLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getMyMaintenanceRequests } from "@/lib/actions/maintenance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Wrench,
  ArrowRight,
  Hash,
  Tag,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MaintenancePriority, MaintenanceStatus, MaintenanceRequest } from "@/types";
import { assertCurrentUserHasModule } from "@/lib/modules";

interface PageProps {
  params: Promise<{ locale: string }>;
}

const priorityConfig: Record<
  MaintenancePriority,
  { variant: "secondary" | "default" | "destructive" | "outline"; className?: string }
> = {
  low: { variant: "secondary" },
  medium: { variant: "default" },
  high: {
    variant: "secondary",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  urgent: { variant: "destructive" },
};

const statusClassName: Record<MaintenanceStatus, string> = {
  open: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  waiting_parts: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export default async function PortalMaintenancePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("maintenance");
  const t = await getTranslations("portal.maintenance");

  const [
    { data: openRequests },
    { data: resolvedRequests },
    { data: allRequests },
  ] = await Promise.all([
    getMyMaintenanceRequests("open"),
    getMyMaintenanceRequests("resolved"),
    getMyMaintenanceRequests("all"),
  ]);

  const renderRequestCard = (request: MaintenanceRequest & { apartments: { id: string; unit_number: string } | null }) => {
    const pCfg = priorityConfig[request.priority as MaintenancePriority];
    const sCls = statusClassName[request.status as MaintenanceStatus];

    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start gap-2 flex-wrap">
                <Badge
                  variant={pCfg.variant}
                  className={cn("capitalize shrink-0", pCfg.className)}
                >
                  {t(`priority.${request.priority}`)}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", sCls)}
                >
                  {t(`status.${request.status}`)}
                </Badge>
              </div>

              <h3 className="font-semibold truncate">{request.title}</h3>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {t(`category.${request.category}`)}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Hash className="h-3 w-3" />
                  {request.reference_code}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(request.created_at), "PP")}
                </span>
              </div>
            </div>

            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link href={`/${locale}/portal/maintenance/${request.id}`}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({
    message,
    showCreate = false,
  }: {
    message: string;
    showCreate?: boolean;
  }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("noRequests")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
        {showCreate && (
          <Button asChild>
            <Link href={`/${locale}/portal/maintenance/new`}>
              <Plus className="h-4 w-4 mr-2" />
              {t("newRequest")}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/portal/maintenance/new`}>
            <Plus className="h-4 w-4 mr-2" />
            {t("newRequest")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="open" className="space-y-6">
        <TabsList>
          <TabsTrigger value="open">
            Open
            {openRequests && openRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {openRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3">
          {openRequests && openRequests.length > 0 ? (
            openRequests.map(renderRequestCard)
          ) : (
            <EmptyState
              message={t("noRequestsDescription")}
              showCreate={true}
            />
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3">
          {resolvedRequests && resolvedRequests.length > 0 ? (
            resolvedRequests.map(renderRequestCard)
          ) : (
            <EmptyState message="You have no resolved requests." />
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {allRequests && allRequests.length > 0 ? (
            allRequests.map(renderRequestCard)
          ) : (
            <EmptyState
              message={t("noRequestsDescription")}
              showCreate={true}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
