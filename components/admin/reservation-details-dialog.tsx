"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReservationStatusBadge } from "@/components/shared/reservation-status-badge";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Mail,
  MapPin,
  Hash,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface Reservation {
  id: string;
  reference_code: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  payment_proof_url?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  public_spaces: {
    id: string;
    name: string;
  };
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ReservationDetailsDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationDetailsDialog({
  reservation,
  open,
  onOpenChange,
}: ReservationDetailsDialogProps) {
  const t = useTranslations("admin.reservations.details");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {t("description", { code: reservation.reference_code })}
              </DialogDescription>
            </div>
            <ReservationStatusBadge status={reservation.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reservation Info */}
          <div>
            <h3 className="font-semibold mb-3">{t("reservation.title")}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium font-mono">
                    {reservation.reference_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("reservation.reference")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{reservation.public_spaces.name}</p>
                  <p className="text-xs text-muted-foreground">{t("reservation.space")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(reservation.start_time), "PPP")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("reservation.date")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(reservation.start_time), "p")} -{" "}
                    {format(new Date(reservation.end_time), "p")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("reservation.time")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    ${reservation.total_amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("reservation.amount")}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Resident Info */}
          <div>
            <h3 className="font-semibold mb-3">{t("resident.title")}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{reservation.profiles.full_name}</p>
                  <p className="text-xs text-muted-foreground">{t("resident.name")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{reservation.profiles.email}</p>
                  <p className="text-xs text-muted-foreground">{t("resident.email")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Proof */}
          {reservation.payment_proof_url && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">{t("payment.title")}</h3>
                <div className="border rounded-lg p-4">
                  <a
                    href={reservation.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {t("payment.viewProof")}
                  </a>
                </div>
              </div>
            </>
          )}

          {/* Cancellation Reason */}
          {reservation.cancellation_reason && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">{t("cancellation.title")}</h3>
                <div className="border rounded-lg p-4 bg-muted">
                  <p className="text-sm">{reservation.cancellation_reason}</p>
                </div>
              </div>
            </>
          )}

          {/* Created At */}
          {reservation.created_at && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                {t("createdAt", {
                  date: format(new Date(reservation.created_at), "PPp"),
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
