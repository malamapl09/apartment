import type { PublicSpace, AvailabilitySchedule, BlackoutDate } from "@/types";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface BookingParams {
  space: PublicSpace;
  startTime: Date;
  endTime: Date;
  schedules: AvailabilitySchedule[];
  blackouts: BlackoutDate[];
  existingReservationsThisMonth: number;
  hasConflict: boolean;
}

export function validateBooking(params: BookingParams): ValidationResult {
  const { space, startTime, endTime, schedules, blackouts, existingReservationsThisMonth, hasConflict } = params;

  const now = new Date();

  // 1. Start time must be in the future
  if (startTime <= now) {
    return { valid: false, error: "Reservation must be in the future" };
  }

  // 2. End time must be after start time
  if (endTime <= startTime) {
    return { valid: false, error: "End time must be after start time" };
  }

  // 3. Check min advance booking time
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilStart < space.min_advance_hours) {
    return { valid: false, error: `Must book at least ${space.min_advance_hours} hours in advance` };
  }

  // 4. Check max advance booking window
  const daysUntilStart = hoursUntilStart / 24;
  if (daysUntilStart > space.max_advance_days) {
    return { valid: false, error: `Cannot book more than ${space.max_advance_days} days in advance` };
  }

  // 5. Check max duration
  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours > space.max_duration_hours) {
    return { valid: false, error: `Maximum duration is ${space.max_duration_hours} hours` };
  }

  // 6. Check monthly limit
  if (existingReservationsThisMonth >= space.max_monthly_per_owner) {
    return { valid: false, error: `Maximum ${space.max_monthly_per_owner} reservations per month` };
  }

  // 7. Check availability schedule (day of week + time)
  const dayOfWeek = startTime.getDay(); // 0=Sun, 6=Sat
  const schedule = schedules.find(s => s.day_of_week === dayOfWeek);
  if (!schedule) {
    return { valid: false, error: "Space is not available on this day" };
  }

  const startTimeStr = startTime.toTimeString().slice(0, 5); // HH:MM
  const endTimeStr = endTime.toTimeString().slice(0, 5);
  if (startTimeStr < schedule.start_time || endTimeStr > schedule.end_time) {
    return { valid: false, error: `Space is available from ${schedule.start_time} to ${schedule.end_time}` };
  }

  // 8. Check blackout dates
  const startDateStr = startTime.toISOString().split("T")[0];
  const isBlackout = blackouts.some(b => b.date === startDateStr);
  if (isBlackout) {
    return { valid: false, error: "Space is not available on this date (blackout)" };
  }

  // 9. Check quiet hours
  if (space.quiet_hours_start && space.quiet_hours_end) {
    if (startTimeStr >= space.quiet_hours_start || endTimeStr <= space.quiet_hours_end) {
      // Check if booking overlaps quiet hours
      if (endTimeStr > space.quiet_hours_start || startTimeStr < space.quiet_hours_end) {
        // More nuanced check needed for overnight quiet hours
      }
    }
  }

  // 10. Check for conflicts (from DB function)
  if (hasConflict) {
    return { valid: false, error: "Time slot conflicts with an existing reservation" };
  }

  return { valid: true };
}
