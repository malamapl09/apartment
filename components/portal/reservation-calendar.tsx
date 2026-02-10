"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { AvailabilitySchedule, BlackoutDate, Reservation } from "@/types";
import { useRealtimeAvailability } from "@/lib/hooks/use-realtime-availability";

interface ReservationCalendarProps {
  spaceId: string;
  schedules: AvailabilitySchedule[];
  blackouts: BlackoutDate[];
  onDateSelect: (date: Date | undefined) => void;
  initialDate?: Date;
}

export default function ReservationCalendar({
  spaceId,
  schedules,
  blackouts,
  onDateSelect,
  initialDate,
}: ReservationCalendarProps) {
  const t = useTranslations("portal.booking");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [month, setMonth] = useState<Date>(initialDate || new Date());

  // Get real-time reservations for the selected date
  const { reservations } = useRealtimeAvailability(spaceId);

  // Create a set of blackout dates for quick lookup
  const blackoutDatesSet = new Set(blackouts.map((b) => b.date));

  // Create a set of available days of week from schedules
  const availableDaysOfWeek = new Set(schedules.map((s) => s.day_of_week));

  // Disable date if:
  // 1. It's in the past
  // 2. It's a blackout date
  // 3. There's no schedule for that day of week
  const isDateDisabled = (date: Date) => {
    // Past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Blackout dates
    const dateStr = date.toISOString().split("T")[0];
    if (blackoutDatesSet.has(dateStr)) return true;

    // No schedule for this day
    const dayOfWeek = date.getDay();
    if (!availableDaysOfWeek.has(dayOfWeek)) return true;

    return false;
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onDateSelect(date);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("select_date")}</CardTitle>
          <CardDescription>{t("select_date_description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={isDateDisabled}
            className="rounded-md border"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_disabled: "text-muted-foreground opacity-50 line-through",
            }}
          />

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>{t("legend.selected")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent" />
              <span>{t("legend.today")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted line-through" />
              <span>{t("legend.unavailable")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show existing reservations for selected date */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>{t("existing_reservations")}</CardTitle>
            <CardDescription>
              {selectedDate.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reservations && reservations.length > 0 ? (
              <div className="space-y-2">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <span className="text-sm font-medium">
                      {reservation.start_time} - {reservation.end_time}
                    </span>
                    <Badge variant="secondary">{t("occupied")}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("no_reservations_this_day")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
