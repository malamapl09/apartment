import { toZonedTime } from "date-fns-tz";
import type {
  PublicSpace,
  AvailabilitySchedule,
  BlackoutDate,
  RecurringBlackout,
} from "@/types";

export type BookingErrorKey =
  | "reservation.mustBeFuture"
  | "reservation.endAfterStart"
  | "reservation.minAdvance"
  | "reservation.maxAdvance"
  | "reservation.maxDuration"
  | "reservation.maxMonthly"
  | "reservation.notAvailableOnDay"
  | "reservation.outsideSchedule"
  | "reservation.blackoutFullDay"
  | "reservation.blackoutPartialDay"
  | "reservation.recurringBlackout"
  | "reservation.conflict"
  | "reservation.restricted"
  | "reservation.dailyCapReached"
  | "reservation.weeklyCapReached"
  | "reservation.monthlyCapReached";

interface ValidationResult {
  valid: boolean;
  errorKey?: BookingErrorKey;
  errorParams?: Record<string, string | number>;
}

interface BookingParams {
  space: PublicSpace;
  startTime: Date;
  endTime: Date;
  timezone: string; // IANA timezone, e.g. "America/Santo_Domingo"
  schedules: AvailabilitySchedule[];
  blackouts: BlackoutDate[];
  recurringBlackouts: RecurringBlackout[];
  existingReservationsThisMonth: number;
  hoursBookedToday: number;
  hoursBookedThisWeek: number;
  hoursBookedThisMonth: number;
  hasRestriction: boolean;
  hasConflict: boolean;
}

function parseTimeToMinutes(hhmmss: string): number {
  // Convention: "23:59:59" represents end-of-day and maps to 1440 so that a
  // booking ending at exactly midnight (next day) passes schedule/blackout
  // comparisons. Postgres `time` has no 24:00 value, so end-of-day is stored
  // as 23:59:59.
  if (hhmmss === "23:59:59") return 1440;
  const [h, m] = hhmmss.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Returns minutes-since-midnight for a Date already expressed in the target TZ
// (as produced by toZonedTime).
function zonedMinutesSinceMidnight(zonedDate: Date): number {
  return zonedDate.getHours() * 60 + zonedDate.getMinutes();
}

function zonedDateString(zonedDate: Date): string {
  const y = zonedDate.getFullYear();
  const m = String(zonedDate.getMonth() + 1).padStart(2, "0");
  const d = String(zonedDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function samePosixDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type BookingSegment = {
  dayOfWeek: number;
  dateString: string;
  startMinutes: number;
  endMinutes: number;
};

// Split a booking into one or two same-day segments in the building's timezone.
// A booking that crosses midnight becomes two segments:
//   [start, 1440] on the start day, then [0, endMinutes] on the next day.
function splitIntoSegments(
  zonedStart: Date,
  zonedEnd: Date,
): BookingSegment[] {
  const startMinutes = zonedMinutesSinceMidnight(zonedStart);
  const endMinutes = zonedMinutesSinceMidnight(zonedEnd);

  if (samePosixDay(zonedStart, zonedEnd)) {
    return [
      {
        dayOfWeek: zonedStart.getDay(),
        dateString: zonedDateString(zonedStart),
        startMinutes,
        endMinutes,
      },
    ];
  }

  return [
    {
      dayOfWeek: zonedStart.getDay(),
      dateString: zonedDateString(zonedStart),
      startMinutes,
      endMinutes: 1440,
    },
    {
      dayOfWeek: zonedEnd.getDay(),
      dateString: zonedDateString(zonedEnd),
      startMinutes: 0,
      endMinutes,
    },
  ];
}

export function validateBooking(params: BookingParams): ValidationResult {
  const {
    space,
    startTime,
    endTime,
    timezone,
    schedules,
    blackouts,
    recurringBlackouts,
    existingReservationsThisMonth,
    hoursBookedToday,
    hoursBookedThisWeek,
    hoursBookedThisMonth,
    hasRestriction,
    hasConflict,
  } = params;

  const now = new Date();

  if (startTime <= now) {
    return { valid: false, errorKey: "reservation.mustBeFuture" };
  }

  if (endTime <= startTime) {
    return { valid: false, errorKey: "reservation.endAfterStart" };
  }

  if (hasRestriction) {
    return { valid: false, errorKey: "reservation.restricted" };
  }

  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < space.min_advance_hours) {
    return {
      valid: false,
      errorKey: "reservation.minAdvance",
      errorParams: { hours: space.min_advance_hours },
    };
  }

  const daysUntilStart = hoursUntilStart / 24;
  if (daysUntilStart > space.max_advance_days) {
    return {
      valid: false,
      errorKey: "reservation.maxAdvance",
      errorParams: { days: space.max_advance_days },
    };
  }

  const durationHours =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours > space.max_duration_hours) {
    return {
      valid: false,
      errorKey: "reservation.maxDuration",
      errorParams: { hours: space.max_duration_hours },
    };
  }

  if (existingReservationsThisMonth >= space.max_monthly_per_owner) {
    return {
      valid: false,
      errorKey: "reservation.maxMonthly",
      errorParams: { count: space.max_monthly_per_owner },
    };
  }

  if (
    space.max_hours_per_day_per_user !== null &&
    hoursBookedToday + durationHours > space.max_hours_per_day_per_user
  ) {
    return {
      valid: false,
      errorKey: "reservation.dailyCapReached",
      errorParams: { hours: space.max_hours_per_day_per_user },
    };
  }

  if (
    space.max_hours_per_week_per_user !== null &&
    hoursBookedThisWeek + durationHours > space.max_hours_per_week_per_user
  ) {
    return {
      valid: false,
      errorKey: "reservation.weeklyCapReached",
      errorParams: { hours: space.max_hours_per_week_per_user },
    };
  }

  if (
    space.max_hours_per_month_per_user !== null &&
    hoursBookedThisMonth + durationHours > space.max_hours_per_month_per_user
  ) {
    return {
      valid: false,
      errorKey: "reservation.monthlyCapReached",
      errorParams: { hours: space.max_hours_per_month_per_user },
    };
  }

  // Convert booking times to the building's timezone before extracting
  // wall-clock day/time. Without this, getDay()/getHours() would return values
  // in the server's runtime timezone, which can be off by a day for buildings
  // in a different timezone from the server.
  const zonedStart = toZonedTime(startTime, timezone);
  const zonedEnd = toZonedTime(endTime, timezone);
  const segments = splitIntoSegments(zonedStart, zonedEnd);

  for (const seg of segments) {
    const schedule = schedules.find((s) => s.day_of_week === seg.dayOfWeek);
    if (!schedule) {
      return { valid: false, errorKey: "reservation.notAvailableOnDay" };
    }
    const scheduleStart = parseTimeToMinutes(schedule.start_time);
    const scheduleEnd = parseTimeToMinutes(schedule.end_time);
    if (seg.startMinutes < scheduleStart || seg.endMinutes > scheduleEnd) {
      return {
        valid: false,
        errorKey: "reservation.outsideSchedule",
        errorParams: { start: schedule.start_time, end: schedule.end_time },
      };
    }

    for (const blackout of blackouts) {
      if (blackout.date !== seg.dateString) continue;
      if (blackout.start_time === null || blackout.end_time === null) {
        return { valid: false, errorKey: "reservation.blackoutFullDay" };
      }
      const bStart = parseTimeToMinutes(blackout.start_time);
      const bEnd = parseTimeToMinutes(blackout.end_time);
      if (seg.startMinutes < bEnd && seg.endMinutes > bStart) {
        return {
          valid: false,
          errorKey: "reservation.blackoutPartialDay",
          errorParams: {
            start: blackout.start_time.slice(0, 5),
            end: blackout.end_time.slice(0, 5),
          },
        };
      }
    }

    for (const rb of recurringBlackouts) {
      if (rb.day_of_week !== seg.dayOfWeek) continue;
      const rbStart = parseTimeToMinutes(rb.start_time);
      const rbEnd = parseTimeToMinutes(rb.end_time);
      if (seg.startMinutes < rbEnd && seg.endMinutes > rbStart) {
        return {
          valid: false,
          errorKey: "reservation.recurringBlackout",
          errorParams: {
            start: rb.start_time.slice(0, 5),
            end: rb.end_time.slice(0, 5),
          },
        };
      }
    }
  }

  if (hasConflict) {
    return { valid: false, errorKey: "reservation.conflict" };
  }

  return { valid: true };
}
