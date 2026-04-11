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

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTimeToMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function validateBooking(params: BookingParams): ValidationResult {
  const {
    space,
    startTime,
    endTime,
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

  const dayOfWeek = startTime.getDay();
  const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);
  if (!schedule) {
    return { valid: false, errorKey: "reservation.notAvailableOnDay" };
  }

  const startMinutes = minutesSinceMidnight(startTime);
  const endMinutes = minutesSinceMidnight(endTime);
  const scheduleStart = parseTimeToMinutes(schedule.start_time);
  const scheduleEnd = parseTimeToMinutes(schedule.end_time);
  if (startMinutes < scheduleStart || endMinutes > scheduleEnd) {
    return {
      valid: false,
      errorKey: "reservation.outsideSchedule",
      errorParams: { start: schedule.start_time, end: schedule.end_time },
    };
  }

  const bookingDate = isoDateString(startTime);
  for (const blackout of blackouts) {
    if (blackout.date !== bookingDate) continue;
    if (blackout.start_time === null || blackout.end_time === null) {
      return { valid: false, errorKey: "reservation.blackoutFullDay" };
    }
    const bStart = parseTimeToMinutes(blackout.start_time);
    const bEnd = parseTimeToMinutes(blackout.end_time);
    if (startMinutes < bEnd && endMinutes > bStart) {
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
    if (rb.day_of_week !== dayOfWeek) continue;
    const rbStart = parseTimeToMinutes(rb.start_time);
    const rbEnd = parseTimeToMinutes(rb.end_time);
    if (startMinutes < rbEnd && endMinutes > rbStart) {
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

  if (hasConflict) {
    return { valid: false, errorKey: "reservation.conflict" };
  }

  return { valid: true };
}
