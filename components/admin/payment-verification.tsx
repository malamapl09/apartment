"use client";

import { useState } from "react";
import { verifyPayment, rejectPayment } from "@/lib/actions/admin-reservations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface PaymentVerificationProps {
  reservation: {
    id: string;
    reference_code: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    payment_proof_url: string | null;
    created_at: string;
    public_spaces: {
      id: string;
      name: string;
    };
    profiles: {
      id: string;
      full_name: string;
      email: string;
      phone?: string;
    };
  };
}

export function PaymentVerification({ reservation }: PaymentVerificationProps) {
  const t = useTranslations("admin.reservations.verification");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [imageError, setImageError] = useState(false);

  const isImage = reservation.payment_proof_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = reservation.payment_proof_url?.match(/\.pdf$/i);

  const handleVerify = async () => {
    setIsVerifying(true);
    const result = await verifyPayment(reservation.id);

    if (result.error) {
      toast.error(t("verify.error"), {
        description: result.error,
      });
    } else {
      toast.success(t("verify.success"), {
        description: t("verify.successDescription"),
      });
    }
    setIsVerifying(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t("reject.reasonRequired"));
      return;
    }

    setIsRejecting(true);
    const result = await rejectPayment(reservation.id, rejectReason);

    if (result.error) {
      toast.error(t("reject.error"), {
        description: result.error,
      });
    } else {
      toast.success(t("reject.success"), {
        description: t("reject.successDescription"),
      });
      setShowRejectDialog(false);
      setRejectReason("");
    }
    setIsRejecting(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">
                {t("title", { code: reservation.reference_code })}
              </CardTitle>
              <CardDescription>
                {t("submittedAt", {
                  date: format(new Date(reservation.created_at), "PPp")
                })}
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {t("status.pending")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Reservation Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">{t("details.title")}</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{reservation.public_spaces.name}</p>
                      <p className="text-xs text-muted-foreground">{t("details.space")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(reservation.start_time), "PPP")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reservation.start_time), "p")} - {format(new Date(reservation.end_time), "p")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        ${reservation.total_amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("details.amount")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">{t("resident.title")}</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{reservation.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t("resident.name")}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{reservation.profiles.email}</p>
                      <p className="text-xs text-muted-foreground">{t("resident.email")}</p>
                    </div>
                  </div>

                  {reservation.profiles.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{reservation.profiles.phone}</p>
                        <p className="text-xs text-muted-foreground">{t("resident.phone")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Payment Proof */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">{t("proof.title")}</h3>

                {!reservation.payment_proof_url ? (
                  <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t("proof.notFound")}</p>
                  </div>
                ) : isImage && !imageError ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={reservation.payment_proof_url}
                      alt={t("proof.alt")}
                      className="w-full h-auto max-h-96 object-contain"
                      onError={() => setImageError(true)}
                    />
                    <div className="p-2 bg-muted">
                      <a
                        href={reservation.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 justify-center"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("proof.viewFull")}
                      </a>
                    </div>
                  </div>
                ) : isPDF ? (
                  <div className="border rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium mb-3">{t("proof.pdfDocument")}</p>
                    <a
                      href={reservation.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("proof.viewPdf")}
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium mb-3">{t("proof.file")}</p>
                    <a
                      href={reservation.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("proof.viewFile")}
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isVerifying || isRejecting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t("actions.reject")}
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || isRejecting}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isVerifying ? t("actions.verifying") : t("actions.verify")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rejectDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t("rejectDialog.reasonLabel")}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t("rejectDialog.reasonPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>
              {t("rejectDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRejecting ? t("rejectDialog.rejecting") : t("rejectDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
