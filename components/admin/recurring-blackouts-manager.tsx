"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

import type { RecurringBlackout } from "@/types";
import {
  createRecurringBlackout,
  deleteRecurringBlackout,
} from "@/lib/actions/recurring-blackouts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  spaceId: string;
  initialRecurringBlackouts: RecurringBlackout[];
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export default function RecurringBlackoutsManager({
  spaceId,
  initialRecurringBlackouts,
}: Props) {
  const t = useTranslations("admin.spaces.recurringBlackouts");
  const tDays = useTranslations("common.days");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("08:00");
  const [reason, setReason] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmit = () => {
    if (days.length === 0) {
      toast.error(t("noDaysSelected"));
      return;
    }

    const formData = new FormData();
    formData.set("space_id", spaceId);
    for (const d of days) formData.append("days", String(d));
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    if (reason) formData.set("reason", reason);

    startTransition(async () => {
      const result = await createRecurringBlackout(formData);
      if ("success" in result && result.success) {
        toast.success(t("addSuccess"));
        setDialogOpen(false);
        setDays([]);
        setReason("");
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("addError"));
      }
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteRecurringBlackout(id, spaceId);
      if ("success" in result && result.success) {
        toast.success(t("deleteSuccess"));
        router.refresh();
      } else if ("error" in result) {
        toast.error(result.error || t("deleteError"));
      }
      setDeletingId(null);
    });
  };

  const byDay = new Map<number, RecurringBlackout[]>();
  for (const rb of initialRecurringBlackouts) {
    const list = byDay.get(rb.day_of_week) ?? [];
    list.push(rb);
    byDay.set(rb.day_of_week, list);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("add")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>{t("overnightHint")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("daysLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS.map((d) => (
                  <label
                    key={d}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={days.includes(d)}
                      onCheckedChange={() => toggleDay(d)}
                    />
                    {tDays(String(d))}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rb_start">{t("startTimeLabel")}</Label>
                <Input
                  id="rb_start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rb_end">{t("endTimeLabel")}</Label>
                <Input
                  id="rb_end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rb_reason">{t("reasonLabel")}</Label>
              <Input
                id="rb_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {initialRecurringBlackouts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {DAYS.map((d) => {
            const rows = byDay.get(d);
            if (!rows || rows.length === 0) return null;
            return (
              <div key={d} className="space-y-2">
                <h4 className="font-semibold text-sm">{tDays(String(d))}</h4>
                {rows.map((rb) => (
                  <Card key={rb.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {rb.start_time.slice(0, 5)}–{rb.end_time.slice(0, 5)}
                        </div>
                        {rb.reason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {rb.reason}
                          </div>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === rb.id}
                          >
                            {deletingId === rb.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("deleteTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteConfirm")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(rb.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
