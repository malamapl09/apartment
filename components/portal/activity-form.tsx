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
  const [isPending, startTransition] = useTransition();

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
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
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("success"));
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

          <p className="text-xs text-muted-foreground">{t("info")}</p>

          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? t("creating") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
