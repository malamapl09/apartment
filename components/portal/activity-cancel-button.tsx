"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  cancelSpaceActivity,
  cancelRecurringActivities,
} from "@/lib/actions/space-activities";

interface ActivityCancelButtonProps {
  activityId: string;
  recurrenceGroupId: string | null;
  isOwner: boolean;
}

export default function ActivityCancelButton({
  activityId,
  recurrenceGroupId,
  isOwner,
}: ActivityCancelButtonProps) {
  const t = useTranslations("portal.activities");
  const [isPending, startTransition] = useTransition();

  if (!isOwner) return null;

  const handleCancelSingle = () => {
    startTransition(async () => {
      const result = await cancelSpaceActivity(activityId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("cancel_success"));
      }
    });
  };

  const handleCancelSeries = () => {
    if (!recurrenceGroupId) return;
    startTransition(async () => {
      const result = await cancelRecurringActivities(recurrenceGroupId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("cancelSeriesSuccess"));
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      {/* Cancel single */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancel")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancel_confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSingle}>
              {t("cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel series */}
      {recurrenceGroupId && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isPending}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("cancelSeries")}</AlertDialogTitle>
              <AlertDialogDescription>{t("cancelSeriesConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelSeries}>
                {t("cancelSeries")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
