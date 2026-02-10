"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { adminCancelReservation } from "@/lib/actions/admin-reservations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Reservation {
  id: string;
  reference_code: string;
  public_spaces: {
    name: string;
  };
}

interface CancelReservationDialogProps {
  reservation: Reservation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelReservationDialog({
  reservation,
  open,
  onOpenChange,
}: CancelReservationDialogProps) {
  const t = useTranslations("admin.reservations.cancel");
  const [reason, setReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error(t("reasonRequired"));
      return;
    }

    setIsCancelling(true);
    const result = await adminCancelReservation(reservation.id, reason);

    if (result.error) {
      toast.error(t("error"), {
        description: result.error,
      });
    } else {
      toast.success(t("success"), {
        description: t("successDescription"),
      });
      onOpenChange(false);
      setReason("");
    }
    setIsCancelling(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", {
              code: reservation.reference_code,
              space: reservation.public_spaces.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{t("reasonLabel")}</Label>
          <Textarea
            id="cancel-reason"
            placeholder={t("reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>
            {t("cancelButton")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCancelling || !reason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isCancelling ? t("cancelling") : t("confirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
