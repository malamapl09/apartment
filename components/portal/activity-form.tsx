"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createSpaceActivity } from "@/lib/actions/space-activities";

interface ActivityFormProps {
  spaceId: string;
  selectedDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ActivityForm({
  spaceId,
  selectedDate,
  open,
  onOpenChange,
}: ActivityFormProps) {
  const t = useTranslations("portal.activities");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setIsRecurring(false);
      setRecurrencePattern("");
      setRecurrenceEndDate("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (!title.trim() || !startTime || !endTime) {
      toast.error(t("validation.fill_required"));
      return;
    }

    startTransition(async () => {
      const result = await createSpaceActivity({
        space_id: spaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: `${dateStr}T${startTime}:00`,
        end_time: `${dateStr}T${endTime}:00`,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring
          ? (recurrencePattern as "daily" | "weekly" | "monthly")
          : undefined,
        recurrence_end_date: isRecurring ? recurrenceEndDate : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isRecurring ? t("recurringSuccess") : t("success")
      );
      handleOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-title">{t("activity_title")} *</Label>
            <Input
              id="activity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("title_placeholder")}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-description">{t("activity_description")}</Label>
            <Textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-start">{t("start_time")} *</Label>
              <Input
                id="activity-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-end">{t("end_time")} *</Label>
              <Input
                id="activity-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is-recurring">{t("isRecurring")}</Label>
            </div>
            <Switch
              id="is-recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>{t("recurrencePattern")}</Label>
                <Select
                  value={recurrencePattern}
                  onValueChange={setRecurrencePattern}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("recurrencePattern")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("recurrence.daily")}</SelectItem>
                    <SelectItem value="weekly">{t("recurrence.weekly")}</SelectItem>
                    <SelectItem value="monthly">{t("recurrence.monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence-end">{t("recurrenceEndDate")}</Label>
                <Input
                  id="recurrence-end"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={dateStr}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t("info")}</p>

          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? t("creating") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
