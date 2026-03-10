import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  User,
  Building,
  Calendar,
  Car,
  RefreshCw,
  LogIn,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { checkInVisitor, checkOutVisitor } from "@/lib/actions/admin-visitors";
import type { VisitorStatus, VisitorWithDetails } from "@/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

function StatusBadge({ status }: { status: VisitorStatus }) {
  const classMap: Record<VisitorStatus, string> = {
    expected: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    expired: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const labelMap: Record<VisitorStatus, string> = {
    expected: "Expected",
    checked_in: "Checked In",
    checked_out: "Checked Out",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return (
    <Badge className={classMap[status]} variant="outline">
      {labelMap[status]}
    </Badge>
  );
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function AdminVisitorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("admin.visitors");

  const supabase = await createClient();

  const { data: visitor, error } = await supabase
    .from("visitors")
    .select(`*, profiles (id, full_name), apartments (id, unit_number)`)
    .eq("id", id)
    .single();

  if (error || !visitor) {
    notFound();
  }

  const v = visitor as VisitorWithDetails;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/admin/visitors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Visitors
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("visitorDetail")}
          </h1>
          <p className="text-muted-foreground">{v.visitor_name}</p>
        </div>
        <StatusBadge status={v.status} />
      </div>

      {/* Access Code - Large Display */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {t("accessCode")}
          </p>
          <span className="font-mono text-5xl font-bold tracking-[0.3em] text-primary">
            {v.access_code}
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Visitor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Visitor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{v.visitor_name}</span>
            </div>
            {v.visitor_id_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID Number</span>
                <span className="font-medium">{v.visitor_id_number}</span>
              </div>
            )}
            {v.visitor_phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{v.visitor_phone}</span>
              </div>
            )}
            {v.purpose && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium">{v.purpose}</span>
              </div>
            )}
            {v.notes && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium">{v.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Apartment & Registered By */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              {t("apartment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("apartment")}</span>
              <span className="font-medium">
                Unit {v.apartments?.unit_number ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("registeredBy")}</span>
              <span className="font-medium">
                {v.profiles?.full_name ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("validFrom")}</span>
              <span className="font-medium">{formatDate(v.valid_from)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("validUntil")}</span>
              <span className="font-medium">{formatDate(v.valid_until)}</span>
            </div>
            {v.is_recurring && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("recurring")}</span>
                <Badge variant="secondary">
                  {v.recurrence_pattern ?? "Yes"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        {(v.vehicle_plate || v.vehicle_description) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4" />
                {t("vehicleInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {v.vehicle_plate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plate</span>
                  <span className="font-mono font-bold">{v.vehicle_plate}</span>
                </div>
              )}
              {v.vehicle_description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium">{v.vehicle_description}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Check-in / Check-out */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {v.checked_in_at ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("checkedInAt")}</span>
                <span className="font-medium">{formatDate(v.checked_in_at)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground">Not yet checked in</p>
            )}
            {v.checked_out_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("checkedOutAt")}
                </span>
                <span className="font-medium">
                  {formatDate(v.checked_out_at)}
                </span>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {v.status === "expected" && (
                <form
                  action={async () => {
                    "use server";
                    await checkInVisitor(id);
                  }}
                >
                  <Button type="submit" size="sm" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    {t("checkIn")}
                  </Button>
                </form>
              )}
              {v.status === "checked_in" && (
                <form
                  action={async () => {
                    "use server";
                    await checkOutVisitor(id);
                  }}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("checkOut")}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
