import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Download,
  Upload,
  XCircle,
  Building,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import { formatDate, formatTime, formatDateTime, formatCurrency } from "@/lib/utils/date";
import ReservationStatusBadge from "@/components/shared/reservation-status-badge";
import PaymentUpload from "@/components/portal/payment-upload";
import { generateICS } from "@/lib/utils/ics-generator";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portal.reservation_detail");

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Fetch reservation with related data
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(`
      *,
      space:spaces (
        id,
        name,
        photo_url,
        description,
        rules,
        capacity,
        hourly_rate,
        deposit_amount,
        is_free,
        building:buildings (
          id,
          name,
          currency,
          bank_account_name,
          bank_account_number,
          bank_name,
          bank_routing_number
        )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !reservation) {
    notFound();
  }

  // Fetch status change history (audit log)
  const { data: statusHistory } = await supabase
    .from("reservation_status_changes")
    .select(`
      *,
      changed_by:profiles (
        full_name,
        email
      )
    `)
    .eq("reservation_id", id)
    .order("changed_at", { ascending: false });

  const canUploadProof = reservation.status === "pending_payment";
  const canCancel =
    reservation.status === "pending_payment" ||
    reservation.status === "payment_submitted";

  // Generate ICS file data
  const handleDownloadICS = () => {
    if (!reservation.space) return "";

    const icsData = generateICS({
      title: `${reservation.space.name} - ${t("reservation")}`,
      description: `${t("reference")}: ${reservation.reference_code}\n${reservation.space.description || ""}`,
      location: reservation.space.building?.name || "",
      startTime: new Date(reservation.start_time),
      endTime: new Date(reservation.end_time),
      referenceCode: reservation.reference_code,
    });

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsData)}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {reservation.space?.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {reservation.space?.building?.name}
          </p>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {/* Photo */}
      {reservation.space?.photo_url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted max-w-3xl">
          <img
            src={reservation.space.photo_url}
            alt={reservation.space.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Reference Code */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("reference_code")}
              </p>
              <p className="text-2xl font-bold font-mono">
                {reservation.reference_code}
              </p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Reservation Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t("date_time")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("date")}</p>
                <p className="font-semibold">{formatDate(reservation.date, locale)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("time")}</p>
                <p className="font-semibold">
                  {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        {!reservation.space?.is_free && (
          <Card>
            <CardHeader>
              <CardTitle>{t("payment_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("hourly_rate")}</span>
                <span className="font-semibold">
                  {formatCurrency(reservation.total_cost, reservation.space?.building?.currency || "USD")}
                </span>
              </div>
              {reservation.space?.deposit_amount > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("deposit")}</span>
                    <span className="font-semibold">
                      {formatCurrency(reservation.space.deposit_amount, reservation.space?.building?.currency || "USD")}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">{t("total")}</span>
                <span className="font-bold">
                  {formatCurrency(
                    reservation.total_cost + (reservation.space?.deposit_amount || 0),
                    reservation.space?.building?.currency || "USD"
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Instructions */}
      {reservation.status === "pending_payment" &&
        reservation.space?.building?.bank_account_number && (
        <Alert id="payment">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">{t("payment_instructions.title")}</p>
            <p className="text-sm mb-4">{t("payment_instructions.description")}</p>
            <div className="space-y-2 text-sm bg-muted p-4 rounded-lg">
              <div>
                <span className="font-medium">{t("payment_instructions.bank")}:</span>{" "}
                {reservation.space.building.bank_name}
              </div>
              <div>
                <span className="font-medium">{t("payment_instructions.account_name")}:</span>{" "}
                {reservation.space.building.bank_account_name}
              </div>
              <div>
                <span className="font-medium">{t("payment_instructions.account_number")}:</span>{" "}
                {reservation.space.building.bank_account_number}
              </div>
              {reservation.space.building.bank_routing_number && (
                <div>
                  <span className="font-medium">{t("payment_instructions.routing")}:</span>{" "}
                  {reservation.space.building.bank_routing_number}
                </div>
              )}
              <div className="mt-3 p-3 bg-primary/10 rounded">
                <span className="font-medium">{t("amount_to_transfer")}:</span>{" "}
                <span className="text-lg font-bold">
                  {formatCurrency(
                    reservation.total_cost + (reservation.space.deposit_amount || 0),
                    reservation.space.building.currency || "USD"
                  )}
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Upload */}
      {canUploadProof && reservation.space?.building?.id && (
        <div id="payment">
          <PaymentUpload
            reservationId={reservation.id}
            buildingId={reservation.space.building.id}
            onSuccess={() => window.location.reload()}
          />
        </div>
      )}

      {/* Payment Proof Preview */}
      {reservation.payment_proof_url && (
        <Card>
          <CardHeader>
            <CardTitle>{t("payment_proof")}</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={reservation.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={reservation.payment_proof_url}
                alt="Payment proof"
                className="max-w-md rounded-lg border"
              />
            </a>
          </CardContent>
        </Card>
      )}

      {/* Space Rules */}
      {reservation.space?.rules && (
        <Card>
          <CardHeader>
            <CardTitle>{t("rules")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reservation.space.rules}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      {statusHistory && statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("status_history")}</CardTitle>
            <CardDescription>{t("status_history_description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusHistory.map((change, index) => (
                <div key={change.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {index < statusHistory.length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ReservationStatusBadge status={change.new_status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(change.changed_at, locale)}
                      </span>
                    </div>
                    {change.changed_by && (
                      <p className="text-sm text-muted-foreground">
                        {t("changed_by")} {change.changed_by.full_name || change.changed_by.email}
                      </p>
                    )}
                    {change.notes && (
                      <p className="text-sm mt-2">{change.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a
                href={handleDownloadICS()}
                download={`reservation-${reservation.reference_code}.ics`}
              >
                <Download className="mr-2 h-4 w-4" />
                {t("download_ics")}
              </a>
            </Button>

            {canCancel && (
              <Button variant="destructive" id="cancel">
                <XCircle className="mr-2 h-4 w-4" />
                {t("cancel_reservation")}
              </Button>
            )}

            <Button asChild variant="outline">
              <Link href={`/${locale}/portal/reservations`}>
                {t("back_to_list")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
