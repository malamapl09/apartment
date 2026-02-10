"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { Clock, AlertCircle } from "lucide-react";
import type { AvailabilitySchedule, Reservation } from "@/types";

interface TimeSlotPickerProps {
  schedule: AvailabilitySchedule;
  reservations: Reservation[];
  gapMinutes: number;
  maxDurationHours?: number;
  onSelect: (startTime: string, endTime: string) => void;
}

export default function TimeSlotPicker({
  schedule,
  reservations,
  gapMinutes,
  maxDurationHours,
  onSelect,
}: TimeSlotPickerProps) {
  const t = useTranslations("portal.booking");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  // Parse time string to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Check if a time range overlaps with existing reservations
  const hasOverlap = (start: string, end: string): boolean => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);

    return reservations.some((reservation) => {
      const resStart = timeToMinutes(reservation.start_time);
      const resEnd = timeToMinutes(reservation.end_time);

      // Add gap before and after existing reservation
      const resStartWithGap = resStart - gapMinutes;
      const resEndWithGap = resEnd + gapMinutes;

      // Check for overlap
      return (
        (startMins >= resStartWithGap && startMins < resEndWithGap) ||
        (endMins > resStartWithGap && endMins <= resEndWithGap) ||
        (startMins <= resStartWithGap && endMins >= resEndWithGap)
      );
    });
  };

  // Validate time selection
  const validateTimes = (start: string, end: string): string | null => {
    if (!start || !end) {
      return t("validation.select_times");
    }

    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    const scheduleStart = timeToMinutes(schedule.start_time);
    const scheduleEnd = timeToMinutes(schedule.end_time);

    // End must be after start
    if (endMins <= startMins) {
      return t("validation.end_after_start");
    }

    // Must be within schedule
    if (startMins < scheduleStart || endMins > scheduleEnd) {
      return t("validation.outside_schedule", {
        start: schedule.start_time,
        end: schedule.end_time,
      });
    }

    // Check max duration
    if (maxDurationHours) {
      const durationMinutes = endMins - startMins;
      const maxMinutes = maxDurationHours * 60;
      if (durationMinutes > maxMinutes) {
        return t("validation.exceeds_max_duration", { hours: maxDurationHours });
      }
    }

    // Check for overlaps
    if (hasOverlap(start, end)) {
      return t("validation.time_conflict");
    }

    return null;
  };

  // Handle time selection
  const handleSubmit = () => {
    const validationError = validateTimes(startTime, endTime);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    onSelect(startTime, endTime);
  };

  // Calculate duration in hours
  const duration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    if (endMins <= startMins) return null;
    return ((endMins - startMins) / 60).toFixed(1);
  }, [startTime, endTime]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("select_time")}
        </CardTitle>
        <CardDescription>
          {t("available_hours")}: {schedule.start_time} - {schedule.end_time}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start-time">{t("start_time")}</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              min={schedule.start_time}
              max={schedule.end_time}
              step="900" // 15-minute intervals
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="end-time">{t("end_time")}</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || schedule.start_time}
              max={schedule.end_time}
              step="900" // 15-minute intervals
            />
          </div>
        </div>

        {/* Duration Display */}
        {duration && (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">
              {t("duration")}: {duration} {t("hours")}
            </p>
            {maxDurationHours && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("max_duration")}: {maxDurationHours} {t("hours")}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Occupied Slots Info */}
        {reservations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("occupied_times")}</Label>
            <div className="space-y-2">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <span className="text-sm">
                    {reservation.start_time} - {reservation.end_time}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("occupied")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button onClick={handleSubmit} className="w-full" size="lg">
          {t("confirm_time")}
        </Button>
      </CardContent>
    </Card>
  );
}
