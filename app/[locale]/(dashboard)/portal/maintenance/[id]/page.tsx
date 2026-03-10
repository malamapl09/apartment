import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getMaintenanceRequest, addComment } from "@/lib/actions/maintenance";
import { MaintenanceComments } from "@/components/shared/maintenance-comments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Hash,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MaintenancePriority, MaintenanceStatus } from "@/types";

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

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PortalMaintenanceDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.maintenance");

  const { data: request, error } = await getMaintenanceRequest(id);

  if (error || !request) {
    notFound();
  }

  const pCfg = priorityConfig[request.priority as MaintenancePriority];
  const sCls = statusClassName[request.status as MaintenanceStatus];

  const handleAddComment = async (body: string) => {
    "use server";
    return addComment(id, body);
  };

  // Public comments only (filter out internal)
  const publicComments = (request.maintenance_comments ?? []).filter(
    (c: { is_internal: boolean }) => !c.is_internal
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/portal/maintenance`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge
              variant={pCfg.variant}
              className={cn("capitalize", pCfg.className)}
            >
              {t(`priority.${request.priority}`)}
            </Badge>
            <Badge variant="secondary" className={cn(sCls)}>
              {t(`status.${request.status}`)}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{request.title}</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {request.reference_code}
          </p>
        </div>
      </div>

      {/* Request Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap">{request.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium capitalize">
                  {t(`category.${request.category}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("referenceCode")}
                </p>
                <p className="font-mono font-medium">{request.reference_code}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {format(new Date(request.created_at), "PP")}
                </p>
              </div>
            </div>

            {request.resolved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="font-medium">
                    {format(new Date(request.resolved_at), "PP")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assigned To */}
          {request.assigned_to ? (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("assignedTo")}
                  </p>
                  <p className="text-sm font-medium">{request.assigned_to}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">
                {t("unassigned")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("photos")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {request.photos.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-md border hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>{t("trackStatus")}</CardTitle>
          <CardDescription>
            Updates and messages from the management team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceComments
            comments={publicComments}
            onAddComment={handleAddComment}
            showInternal={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
