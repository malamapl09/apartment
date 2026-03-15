"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations, useLocale } from "next-intl";
import type { AvailabilitySchedule, BlackoutDate } from "@/types";
import { useRealtimeAvailability } from "@/lib/hooks/use-realtime-availability";

interface ReservationCalendarProps {
  spaceId: string;
  schedules: AvailabilitySchedule[];
  blackouts: BlackoutDate[];
  onDateSelect: (date: Date | undefined) => void;
  initialDate?: Date;
}

type OccupancyLevel = "light" | "busy" | "full";

// Parse time string "HH:MM" to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Extract "HH:MM" from a datetime string (ISO or raw time)
function extractTime(value: string): string {
  if (value.includes("T")) return value.split("T")[1].substring(0, 5);
  return value.substring(0, 5);
}

// Format a Date to "YYYY-MM-DD" using local time
function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ReservationCalendar({
  spaceId,
  schedules,
  blackouts,
  onDateSelect,
  initialDate,
}: ReservationCalendarProps) {
  const t = useTranslations("portal.booking");
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [month, setMonth] = useState<Date>(initialDate || new Date());

  const { reservations } = useRealtimeAvailability(spaceId);

  const blackoutDatesSet = useMemo(
    () => new Set(blackouts.map((b) => b.date)),
    [blackouts]
  );

  const availableDaysOfWeek = useMemo(
    () => new Set(schedules.map((s) => s.day_of_week)),
    [schedules]
  );

  // Build occupancy map: date string -> OccupancyLevel
  const occupancyMap = useMemo(() => {
    const map = new Map<string, OccupancyLevel>();
    if (!reservations || reservations.length === 0) return map;

    // Group reservations by date
    const byDate = new Map<string, { start: number; end: number }[]>();
    for (const res of reservations) {
      const dateStr = toDateStr(new Date(res.start_time));
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr)!.push({
        start: timeToMinutes(extractTime(res.start_time)),
        end: timeToMinutes(extractTime(res.end_time)),
      });
    }

    for (const [dateStr, dateRes] of byDate) {
      const date = new Date(dateStr + "T00:00:00");
      const schedule = schedules.find((s) => s.day_of_week === date.getDay());
      if (!schedule) continue;

      const schedStart = timeToMinutes(schedule.start_time);
      const schedEnd = timeToMinutes(schedule.end_time);
      const totalMinutes = schedEnd - schedStart;
      if (totalMinutes <= 0) continue;

      let bookedMinutes = 0;
      for (const r of dateRes) {
        const overlapStart = Math.max(r.start, schedStart);
        const overlapEnd = Math.min(r.end, schedEnd);
        if (overlapEnd > overlapStart) bookedMinutes += overlapEnd - overlapStart;
      }

      const ratio = bookedMinutes / totalMinutes;
      if (ratio >= 0.9) map.set(dateStr, "full");
      else if (ratio >= 0.5) map.set(dateStr, "busy");
      else if (ratio > 0) map.set(dateStr, "light");
    }

    return map;
  }, [reservations, schedules]);

  // Build modifier date arrays for react-day-picker
  const { lightDates, busyDates, fullDates } = useMemo(() => {
    const light: Date[] = [];
    const busy: Date[] = [];
    const full: Date[] = [];

    for (const [dateStr, level] of occupancyMap) {
      const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone edge cases
      if (level === "light") light.push(d);
      else if (level === "busy") busy.push(d);
      else if (level === "full") full.push(d);
    }

    return { lightDates: light, busyDates: busy, fullDates: full };
  }, [occupancyMap]);

  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const dateStr = toDateStr(date);
    if (blackoutDatesSet.has(dateStr)) return true;

    if (!availableDaysOfWeek.has(date.getDay())) return true;

    return false;
  }, [blackoutDatesSet, availableDaysOfWeek]);

  // Get reservations for selected date
  const selectedDateReservations = useMemo(() => {
    if (!selectedDate || !reservations) return [];
    const dateStr = toDateStr(selectedDate);

    return reservations
      .filter((res) => toDateStr(new Date(res.start_time)) === dateStr)
      .map((res) => ({
        start: extractTime(res.start_time),
        end: extractTime(res.end_time),
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [selectedDate, reservations]);

  const selectedSchedule = useMemo(
    () => selectedDate
      ? schedules.find((s) => s.day_of_week === selectedDate.getDay())
      : undefined,
    [selectedDate, schedules]
  );

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
          {/* Occupancy dot indicators via CSS pseudo-elements on modifier classes */}
          <style>{`
            .rdp-occupancy-light button,
            .rdp-occupancy-busy button,
            .rdp-occupancy-full button {
              position: relative;
            }
            .rdp-occupancy-light button::after,
            .rdp-occupancy-busy button::after,
            .rdp-occupancy-full button::after {
              content: '';
              position: absolute;
              bottom: 2px;
              left: 50%;
              transform: translateX(-50%);
              width: 6px;
              height: 6px;
              border-radius: 50%;
              pointer-events: none;
            }
            .rdp-occupancy-light button::after {
              background-color: #22c55e;
            }
            .rdp-occupancy-busy button::after {
              background-color: #f59e0b;
            }
            .rdp-occupancy-full button::after {
              background-color: #ef4444;
            }
          `}</style>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={isDateDisabled}
            modifiers={{
              occupancy_light: lightDates,
              occupancy_busy: busyDates,
              occupancy_full: fullDates,
            }}
            modifiersClassNames={{
              occupancy_light: "rdp-occupancy-light",
              occupancy_busy: "rdp-occupancy-busy",
              occupancy_full: "rdp-occupancy-full",
            }}
            className="rounded-md border"
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
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span>{t("occupancy.light")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>{t("occupancy.busy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span>{t("occupancy.full")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Timeline for selected date */}
      {selectedDate && selectedSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>{t("daily_timeline")}</CardTitle>
            <CardDescription>
              {selectedDate.toLocaleDateString(locale)} &mdash; {selectedSchedule.start_time} – {selectedSchedule.end_time}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyTimeline
              schedule={selectedSchedule}
              reservations={selectedDateReservations}
              labels={{
                available: t("timeline.available"),
                occupied: t("timeline.occupied"),
                noReservations: t("no_reservations_this_day"),
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Daily Timeline component ---

interface DailyTimelineProps {
  schedule: AvailabilitySchedule;
  reservations: { start: string; end: string }[];
  labels: {
    available: string;
    occupied: string;
    noReservations: string;
  };
}

function DailyTimeline({ schedule, reservations, labels }: DailyTimelineProps) {
  const scheduleStart = timeToMinutes(schedule.start_time);
  const scheduleEnd = timeToMinutes(schedule.end_time);
  const totalMinutes = scheduleEnd - scheduleStart;

  if (totalMinutes <= 0) return null;

  // Generate hour markers (exclude last if it would clip at 100%)
  const hourMarkers: number[] = [];
  const firstHour = Math.ceil(scheduleStart / 60) * 60;
  for (let m = firstHour; m < scheduleEnd; m += 60) {
    hourMarkers.push(m);
  }

  const toPercent = (minutes: number) =>
    ((minutes - scheduleStart) / totalMinutes) * 100;

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Timeline bar */}
      <TooltipProvider delayDuration={100}>
        <div className="relative">
          {/* Background = available */}
          <div className="h-10 rounded-lg bg-green-100 dark:bg-green-950 border relative overflow-hidden">
            {/* Occupied blocks */}
            {reservations.map((res) => {
              const startMins = timeToMinutes(res.start);
              const endMins = timeToMinutes(res.end);
              const left = toPercent(Math.max(startMins, scheduleStart));
              const right = toPercent(Math.min(endMins, scheduleEnd));
              const width = right - left;

              return (
                <Tooltip key={`${res.start}-${res.end}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-0 bg-red-400/70 dark:bg-red-500/50 border-x border-red-500/30 cursor-default"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      role="img"
                      aria-label={`${labels.occupied}: ${res.start} – ${res.end}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {res.start} – {res.end} ({labels.occupied})
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Hour tick marks */}
          <div className="relative h-5 mt-1">
            {hourMarkers.map((m) => (
              <span
                key={m}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${toPercent(m)}%` }}
              >
                {formatTime(m)}
              </span>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {/* Timeline legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-green-100 dark:bg-green-950 border" />
          {labels.available}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-5 rounded bg-red-400/70 dark:bg-red-500/50 border border-red-500/30" />
          {labels.occupied}
        </div>
      </div>

      {/* Reservation list */}
      {reservations.length > 0 ? (
        <div className="space-y-2">
          {reservations.map((res) => (
            <div
              key={`${res.start}-${res.end}`}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
            >
              <span className="text-sm font-medium">
                {res.start} – {res.end}
              </span>
              <Badge variant="secondary">{labels.occupied}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          {labels.noReservations}
        </p>
      )}
    </div>
  );
}
