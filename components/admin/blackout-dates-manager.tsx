"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlackoutDate } from "@/types";
import { addBlackout, removeBlackout } from "@/lib/actions/blackout-dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface BlackoutDatesManagerProps {
  spaceId: string;
  initialBlackouts: BlackoutDate[];
  locale: string;
}

export default function BlackoutDatesManager({
  spaceId,
  initialBlackouts,
  locale,
}: BlackoutDatesManagerProps) {
  const t = useTranslations("admin.spaces.blackouts_manager");
  const router = useRouter();
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(initialBlackouts);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddBlackout = async () => {
    if (!selectedDate) {
      toast.error(t("selectDateError"));
      return;
    }
    if (!allDay && endTime <= startTime) {
      toast.error(t("timeRangeError"));
      return;
    }

    setIsAdding(true);

    try {
      const result = await addBlackout(
        spaceId,
        format(selectedDate, "yyyy-MM-dd"),
        reason || undefined,
        allDay ? null : startTime,
        allDay ? null : endTime,
      );

      if ('success' in result && result.success) {
        toast.success(t("addSuccess"));
        setSelectedDate(undefined);
        setReason("");
        setAllDay(true);
        router.refresh();
      } else if ('error' in result) {
        toast.error(result.error || t("addError"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveBlackout = async (id: string) => {
    setDeletingId(id);

    try {
      const result = await removeBlackout(id, spaceId);

      if ('success' in result && result.success) {
        setBlackouts((prev) => prev.filter((b) => b.id !== id));
        toast.success(t("removeSuccess"));
      } else if ('error' in result) {
        toast.error(result.error || t("removeError"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
    } finally {
      setDeletingId(null);
    }
  };

  // Dates that are full-day blacked out — partial-day blackouts don't disable the calendar
  const fullDayBlackoutDates = blackouts
    .filter((b) => b.start_time === null && b.end_time === null)
    .map((b) => new Date(b.date));

  return (
    <div className="space-y-6">
      {/* Add New Blackout */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("selectDateLabel")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>{t("pickDate")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      date < new Date() ||
                      (allDay &&
                        fullDayBlackoutDates.some(
                          (bd) => bd.toDateString() === date.toDateString(),
                        ))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="all_day">{t("allDay")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("allDayDescription")}
                </p>
              </div>
              <Switch id="all_day" checked={allDay} onCheckedChange={setAllDay} />
            </div>

            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_time">{t("startTime")}</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">{t("endTime")}</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">{t("reasonLabel")}</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>

            <Button
              onClick={handleAddBlackout}
              disabled={!selectedDate || isAdding}
              className="w-full"
            >
              {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("addButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Blackouts List */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t("listTitle")}</h3>

        {blackouts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t("empty")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {blackouts
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() -
                  new Date(b.date).getTime()
              )
              .map((blackout) => (
                <Card key={blackout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">
                          {format(new Date(blackout.date), "PPP")}
                          {blackout.start_time && blackout.end_time && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              {blackout.start_time.slice(0, 5)}–{blackout.end_time.slice(0, 5)}
                            </span>
                          )}
                        </div>
                        {blackout.reason && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {blackout.reason}
                          </div>
                        )}
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === blackout.id}
                          >
                            {deletingId === blackout.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("removeDialogTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("removeDialogDescription", { date: format(new Date(blackout.date), "PPP") })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("removeDialogCancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveBlackout(blackout.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("removeDialogConfirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
