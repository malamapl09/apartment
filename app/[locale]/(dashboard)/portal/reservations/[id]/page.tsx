import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  FileText,
  Download,
  Building,
  AlertCircle,
  Image as ImageIcon,
  CreditCard,
} from "lucide-react";
import { formatDate, formatTime, formatCurrency } from "@/lib/utils/date";
import ReservationStatusBadge from "@/components/shared/reservation-status-badge";
import PaymentUpload from "@/components/portal/payment-upload";
import CancelReservationButton from "@/components/portal/cancel-reservation-button";
import { generateICS } from "@/lib/utils/ics-generator";
import { assertCurrentUserHasModule } from "@/lib/modules";
import type { BankAccountInfo } from "@/types";

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await assertCurrentUserHasModule("reservations");
  const t = await getTranslations("portal.reservation_detail");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Fetch the reservation + the space + the building's bank info in one shot.
  // The reservations table has start_time/end_time (timestamptz) and
  // payment_amount (nullable). public_spaces has photos[], hourly_rate,
  // deposit_amount. buildings has bank_account_info jsonb.
  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(
      `*,
       public_spaces (
         id,
         name,
         description,
         photos,
         hourly_rate,
         deposit_amount,
         building_id,
         buildings (
           id,
           name,
           bank_account_info
         )
       )`,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !reservation) {
    notFound();
  }

  const space = reservation.public_spaces;
  const buildingsRel = (space as { buildings?: unknown } | null)?.buildings;
  const building = Array.isArray(buildingsRel) ? buildingsRel[0] : buildingsRel;
  const bankInfo =
    (building as { bank_account_info?: BankAccountInfo | null } | null)?.bank_account_info ?? null;

  const isFree =
    (space?.hourly_rate ?? 0) === 0 && (space?.deposit_amount ?? 0) === 0;
  const totalAmount = reservation.payment_amount ?? 0;
  const depositAmount = space?.deposit_amount ?? 0;
  const hourlyCost = totalAmount - depositAmount;
  const photo = space?.photos?.[0] ?? null;

  const canUploadProof = reservation.status === "pending_payment";
  const canCancel =
    reservation.status === "pending_payment" ||
    reservation.status === "payment_submitted";

  const icsData = generateICS({
    title: `${space?.name ?? "Reservation"} - ${t("reservation")}`,
    description: `${t("reference")}: ${reservation.reference_code}\n${space?.description ?? ""}`,
    location: (building as { name?: string } | null)?.name ?? "",
    startTime: new Date(reservation.start_time),
    endTime: new Date(reservation.end_time),
    referenceCode: reservation.reference_code,
  });
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsData)}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {space?.name ?? "—"}
          </h1>
          {(building as { name?: string } | null)?.name && (
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Building className="h-4 w-4" />
              {(building as { name?: string }).name}
            </p>
          )}
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {/* Photo */}
      {photo ? (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted max-w-3xl">
          <img
            src={photo}
            alt={space?.name ?? ""}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted max-w-3xl flex items-center justify-center">
          <ImageIcon className="h-24 w-24 text-muted-foreground" />
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
                <p className="font-semibold">
                  {formatDate(reservation.start_time, locale)}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("time")}</p>
                <p className="font-semibold">
                  {formatTime(reservation.start_time, locale)} -{" "}
                  {formatTime(reservation.end_time, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        {!isFree && (
          <Card>
            <CardHeader>
              <CardTitle>{t("payment_info")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("hourly_rate")}
                </span>
                <span className="font-semibold">
                  {formatCurrency(hourlyCost, locale)}
                </span>
              </div>
              {depositAmount > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("deposit")}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(depositAmount, locale)}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">{t("total")}</span>
                <span className="font-bold">
                  {formatCurrency(totalAmount, locale)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Instructions — only when waiting on a transfer */}
      {reservation.status === "pending_payment" && !isFree && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">
              {t("payment_instructions.title")}
            </p>
            <p className="text-sm mb-4">
              {t("payment_instructions.description")}
            </p>
            <div className="space-y-2 text-sm bg-muted p-4 rounded-lg">
              {bankInfo ? (
                <>
                  {bankInfo.bank_name && (
                    <div>
                      <span className="font-medium">
                        {t("payment_instructions.bank")}:
                      </span>{" "}
                      {bankInfo.bank_name}
                    </div>
                  )}
                  {bankInfo.holder_name && (
                    <div>
                      <span className="font-medium">
                        {t("payment_instructions.account_name")}:
                      </span>{" "}
                      {bankInfo.holder_name}
                    </div>
                  )}
                  {bankInfo.account_number && (
                    <div>
                      <span className="font-medium">
                        {t("payment_instructions.account_number")}:
                      </span>{" "}
                      <span className="font-mono">
                        {bankInfo.account_number}
                      </span>
                    </div>
                  )}
                  {bankInfo.account_type && (
                    <div>
                      <span className="font-medium">
                        {t("payment_instructions.account_type")}:
                      </span>{" "}
                      {bankInfo.account_type}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">
                  {t("payment_instructions.missing")}
                </p>
              )}
              <div className="mt-3 p-3 bg-primary/10 rounded">
                <span className="font-medium">{t("amount_to_transfer")}:</span>{" "}
                <span className="text-lg font-bold">
                  {formatCurrency(totalAmount, locale)}
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Upload */}
      {canUploadProof && building && (
        <div id="payment">
          <PaymentUpload
            reservationId={reservation.id}
            buildingId={(building as { id: string }).id}
          />
        </div>
      )}

      {/* Payment Proof Preview */}
      {reservation.payment_proof_url && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("payment_proof")}
            </CardTitle>
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

      {/* Notes (resident-provided when booking) */}
      {reservation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{t("notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reservation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Cancellation reason (when admin or resident has cancelled) */}
      {reservation.cancellation_reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">{t("cancellation_reason")}</p>
            <p className="text-sm">{reservation.cancellation_reason}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a
                href={icsHref}
                download={`reservation-${reservation.reference_code}.ics`}
              >
                <Download className="mr-2 h-4 w-4" />
                {t("download_ics")}
              </a>
            </Button>

            {canCancel && (
              <CancelReservationButton reservationId={reservation.id} />
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
