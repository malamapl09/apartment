import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addInternalNote } from "@/lib/actions/admin-maintenance";
import { MaintenanceStatusUpdate } from "@/components/admin/maintenance-status-update";
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
  Building2,
  Tag,
  Hash,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { MaintenancePriority, MaintenanceStatus } from "@/types";
import { assertCurrentUserHasModule } from "@/lib/modules";

const priorityVariant: Record<
  MaintenancePriority,
  { variant: "secondary" | "default" | "destructive" | "outline"; className?: string }
> = {
  low: { variant: "secondary" },
  medium: { variant: "default" },
  high: { variant: "secondary", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
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

export default async function AdminMaintenanceDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("maintenance");
  const t = await getTranslations("admin.maintenance");

  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from("maintenance_requests")
    .select(
      `*, profiles (id, full_name, email), apartments (id, unit_number), maintenance_comments (*, profiles (id, full_name))`
    )
    .eq("id", id)
    .single();

  if (error || !request) {
    notFound();
  }

  const pConfig = priorityVariant[request.priority as MaintenancePriority];

  const handleAddInternalNote = async (body: string) => {
    "use server";
    return addInternalNote(id, body);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/${locale}/admin/maintenance`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{request.title}</h1>
            <Badge
              variant={pConfig.variant}
              className={cn("capitalize", pConfig.className)}
            >
              {t(`priority.${request.priority}`)}
            </Badge>
            <Badge
              variant="secondary"
              className={cn(statusClassName[request.status as MaintenanceStatus])}
            >
              {t(`status.${request.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {request.reference_code}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>{t("requestDetail")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>

              {/* Photos */}
              {request.photos && request.photos.length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {request.photos.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full aspect-square object-cover rounded-md border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>{t("comments")}</CardTitle>
              <CardDescription>
                Public and internal notes for this request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceComments
                comments={request.maintenance_comments ?? []}
                onAddComment={handleAddInternalNote}
                showInternal={true}
                placeholder={t("notePlaceholder")}
                addCommentLabel={t("addNote")}
                successMessage={t("noteAdded")}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>{t("updateStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MaintenanceStatusUpdate
                requestId={request.id}
                currentStatus={request.status}
                currentAssignedTo={request.assigned_to}
              />
            </CardContent>
          </Card>

          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("referenceCode")}
                  </p>
                  <p className="text-sm font-mono font-medium">
                    {request.reference_code}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm capitalize">
                    {t(`category.${request.category}`)}
                  </p>
                </div>
              </div>

              {request.profiles && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("requestedBy")}
                    </p>
                    <p className="text-sm font-medium">
                      {request.profiles.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.profiles.email}
                    </p>
                  </div>
                </div>
              )}

              {request.apartments && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("apartment")}
                    </p>
                    <p className="text-sm font-medium">
                      Unit {request.apartments.unit_number}
                    </p>
                  </div>
                </div>
              )}

              {request.assigned_to && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("assignedTo")}
                    </p>
                    <p className="text-sm font-medium">{request.assigned_to}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("createdAt")}
                  </p>
                  <p className="text-sm">
                    {format(new Date(request.created_at), "PPp")}
                  </p>
                </div>
              </div>

              {request.resolved_at && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("resolvedAt")}
                    </p>
                    <p className="text-sm">
                      {format(new Date(request.resolved_at), "PPp")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
