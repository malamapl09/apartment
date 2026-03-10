"use client";

import { useState } from "react";
import { AvailabilitySchedule } from "@/types";
import { updateSchedule } from "@/lib/actions/schedules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AvailabilityEditorProps {
  spaceId: string;
  initialSchedule: AvailabilitySchedule[];
  locale: string;
}

export default function AvailabilityEditor({
  spaceId,
  initialSchedule,
  locale,
}: AvailabilityEditorProps) {
  const t = useTranslations("admin.spaces.availability");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const DAYS_OF_WEEK = [
    { value: 0, label: t("days.sunday") },
    { value: 1, label: t("days.monday") },
    { value: 2, label: t("days.tuesday") },
    { value: 3, label: t("days.wednesday") },
    { value: 4, label: t("days.thursday") },
    { value: 5, label: t("days.friday") },
    { value: 6, label: t("days.saturday") },
  ];

  // Initialize schedule state
  const [schedule, setSchedule] = useState<
    Record<number, { enabled: boolean; start: string; end: string }>
  >(() => {
    const initialState: Record<
      number,
      { enabled: boolean; start: string; end: string }
    > = {};

    DAYS_OF_WEEK.forEach(({ value }) => {
      const existing = initialSchedule.find((s) => s.day_of_week === value);
      initialState[value] = {
        enabled: !!existing,
        start: existing?.start_time || "09:00",
        end: existing?.end_time || "17:00",
      };
    });

    return initialState;
  });

  const handleToggleDay = (day: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleTimeChange = (
    day: number,
    field: "start" | "end",
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert schedule object to array format for the action
      const scheduleData = Object.entries(schedule).map(([day, data]) => ({
        day_of_week: parseInt(day),
        is_available: data.enabled,
        start_time: data.start,
        end_time: data.end,
      }));

      const result = await updateSchedule(spaceId, scheduleData);

      if (result.success) {
        toast.success(t("updateSuccess"));
      } else {
        toast.error(result.error || t("updateError"));
      }
    } catch (error) {
      toast.error(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {DAYS_OF_WEEK.map(({ value, label }) => (
          <Card key={value}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Day Toggle */}
                <div className="flex items-center space-x-3 min-w-[140px]">
                  <Switch
                    id={`day-${value}`}
                    checked={schedule[value].enabled}
                    onCheckedChange={() => handleToggleDay(value)}
                  />
                  <Label
                    htmlFor={`day-${value}`}
                    className="font-semibold cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>

                {/* Time Inputs */}
                {schedule[value].enabled && (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      <Label
                        htmlFor={`start-${value}`}
                        className="text-sm text-muted-foreground min-w-[40px]"
                      >
                        {t("from")}
                      </Label>
                      <Input
                        id={`start-${value}`}
                        type="time"
                        value={schedule[value].start}
                        onChange={(e) =>
                          handleTimeChange(value, "start", e.target.value)
                        }
                        className="max-w-[140px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Label
                        htmlFor={`end-${value}`}
                        className="text-sm text-muted-foreground min-w-[40px]"
                      >
                        {t("to")}
                      </Label>
                      <Input
                        id={`end-${value}`}
                        type="time"
                        value={schedule[value].end}
                        onChange={(e) =>
                          handleTimeChange(value, "end", e.target.value)
                        }
                        className="max-w-[140px]"
                      />
                    </div>
                  </div>
                )}

                {!schedule[value].enabled && (
                  <p className="text-sm text-muted-foreground flex-1">
                    {t("notAvailable")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("saveSchedule")}
        </Button>
      </div>
    </form>
  );
}
