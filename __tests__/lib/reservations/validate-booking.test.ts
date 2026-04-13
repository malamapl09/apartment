import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateBooking } from "@/lib/reservations/validate-booking";
import type {
  PublicSpace,
  AvailabilitySchedule,
  BlackoutDate,
  RecurringBlackout,
} from "@/types";

/**
 * Unit tests for the pure booking validator. The validator takes all
 * dependencies as parameters, so we can test every branch without mocking a
 * database.
 *
 * Covers:
 *   - Baseline checks (min/max advance, duration, monthly cap, schedule)
 *   - New: restriction, daily/weekly/monthly hour caps
 *   - New: partial-day and full-day blackouts
 *   - New: recurring-blackout overlap on same weekday / allowed on other days
 */

// "Now" is frozen to Wednesday 2026-04-15T10:00:00-04:00 (building TZ).
// All test bookings are far enough in the future to satisfy min_advance_hours.
const FROZEN_NOW = new Date("2026-04-15T14:00:00.000Z"); // 10:00 local EST

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeSpace(overrides: Partial<PublicSpace> = {}): PublicSpace {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    building_id: "00000000-0000-4000-8000-000000000100",
    name: "Gym",
    description: null,
    capacity: 10,
    photos: [],
    pricing_type: "hourly",
    hourly_rate: 0,
    deposit_amount: 0,
    allow_reservations: true,
    min_advance_hours: 1,
    max_advance_days: 60,
    max_duration_hours: 8,
    max_monthly_per_owner: 10,
    gap_minutes: 0,
    max_hours_per_day_per_user: null,
    max_hours_per_week_per_user: null,
    max_hours_per_month_per_user: null,
    cancellation_hours: 0,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function allDayOpenSchedules(): AvailabilitySchedule[] {
  return Array.from({ length: 7 }, (_, day) => ({
    id: `sched-${day}`,
    space_id: "00000000-0000-4000-8000-000000000001",
    day_of_week: day,
    start_time: "00:00:00",
    end_time: "23:59:59",
  }));
}

const UTC = "UTC";

const BASE_PARAMS = {
  timezone: UTC,
  schedules: allDayOpenSchedules(),
  blackouts: [] as BlackoutDate[],
  recurringBlackouts: [] as RecurringBlackout[],
  existingReservationsThisMonth: 0,
  hoursBookedToday: 0,
  hoursBookedThisWeek: 0,
  hoursBookedThisMonth: 0,
  hasRestriction: false,
  hasConflict: false,
};

describe("validateBooking — baseline", () => {
  it("rejects a booking in the past", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-10T10:00:00.000Z"),
      endTime: new Date("2026-04-10T11:00:00.000Z"),
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.mustBeFuture");
  });

  it("rejects when end <= start", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T10:00:00.000Z"),
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.endAfterStart");
  });

  it("rejects when duration exceeds space max_duration_hours", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 2 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T13:00:00.000Z"),
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.maxDuration");
  });

  it("rejects when monthly count is reached", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_monthly_per_owner: 3 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
      existingReservationsThisMonth: 3,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.maxMonthly");
  });

  it("accepts a valid booking", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a conflict from the DB availability check", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
      hasConflict: true,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.conflict");
  });
});

describe("validateBooking — restriction", () => {
  it("rejects when the user has an active restriction", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
      hasRestriction: true,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.restricted");
  });
});

describe("validateBooking — hour caps", () => {
  it("rejects when daily cap would be exceeded", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_hours_per_day_per_user: 4 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T12:00:00.000Z"), // +2h
      hoursBookedToday: 3,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.dailyCapReached");
  });

  it("allows exactly at the daily cap", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_hours_per_day_per_user: 4 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"), // +1h
      hoursBookedToday: 3,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects when weekly cap would be exceeded", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_hours_per_week_per_user: 6 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T12:00:00.000Z"),
      hoursBookedThisWeek: 5,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.weeklyCapReached");
  });

  it("rejects when monthly cap would be exceeded", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_hours_per_month_per_user: 10 }),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:30:00.000Z"), // +1.5h
      hoursBookedThisMonth: 9,
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.monthlyCapReached");
  });
});

describe("validateBooking — blackouts", () => {
  it("rejects a full-day blackout", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-20",
          reason: null,
          start_time: null,
          end_time: null,
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.blackoutFullDay");
  });

  it("rejects a partial-day blackout that overlaps the booking", () => {
    // Booking is 10:00–12:00 local, blackout is 11:00–13:00 local → overlaps
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T12:00:00.000Z"),
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-20",
          reason: null,
          start_time: "11:00:00",
          end_time: "13:00:00",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.blackoutPartialDay");
  });

  it("allows a partial-day blackout that doesn't overlap", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      startTime: new Date("2026-04-20T10:00:00.000Z"),
      endTime: new Date("2026-04-20T11:00:00.000Z"),
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-20",
          reason: null,
          start_time: "14:00:00",
          end_time: "16:00:00",
        },
      ],
    });
    expect(r.valid).toBe(true);
  });
});

describe("validateBooking — recurring blackouts", () => {
  // 2026-04-20 is a Monday (day_of_week=1)
  const mondayBooking = {
    startTime: new Date("2026-04-20T10:00:00.000Z"),
    endTime: new Date("2026-04-20T12:00:00.000Z"),
  };

  it("rejects when a recurring blackout on the same weekday overlaps", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      ...mondayBooking,
      recurringBlackouts: [
        {
          id: "rb1",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 1, // Monday
          start_time: "11:00:00",
          end_time: "13:00:00",
          reason: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.recurringBlackout");
  });

  it("allows the booking when the recurring blackout is on a different weekday", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      ...mondayBooking,
      recurringBlackouts: [
        {
          id: "rb1",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 2, // Tuesday — booking is Monday
          start_time: "11:00:00",
          end_time: "13:00:00",
          reason: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it("allows the booking when times don't overlap on same weekday", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace(),
      ...mondayBooking,
      recurringBlackouts: [
        {
          id: "rb1",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 1,
          start_time: "14:00:00",
          end_time: "16:00:00",
          reason: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(true);
  });
});

describe("validateBooking — cross-midnight bookings", () => {
  // 2026-04-20 is a Monday, 2026-04-21 is a Tuesday.
  // A Mon 22:00 → Tue 01:00 UTC booking spans both days.
  const overnightBooking = {
    startTime: new Date("2026-04-20T22:00:00.000Z"),
    endTime: new Date("2026-04-21T01:00:00.000Z"),
  };

  it("rejects an overnight booking that hits a Monday-side recurring blackout split row", () => {
    // Admin created a 22:00–08:00 nightly window that got stored as two rows:
    // Mon [22:00, 23:59:59] and Tue [00:00:00, 08:00]. Either row should reject.
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 8 }),
      ...overnightBooking,
      recurringBlackouts: [
        {
          id: "rb1",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 1, // Monday
          start_time: "22:00:00",
          end_time: "23:59:59",
          reason: "Quiet hours",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.recurringBlackout");
  });

  it("rejects an overnight booking that hits a Tuesday-side recurring blackout split row", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 8 }),
      ...overnightBooking,
      recurringBlackouts: [
        {
          id: "rb2",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 2, // Tuesday
          start_time: "00:00:00",
          end_time: "08:00:00",
          reason: "Quiet hours",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.recurringBlackout");
  });

  it("rejects an overnight booking when the Tuesday date has a full-day blackout", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 8 }),
      ...overnightBooking,
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-21",
          reason: null,
          start_time: null,
          end_time: null,
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.blackoutFullDay");
  });

  it("rejects an overnight booking when a Tuesday partial-day blackout overlaps", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 8 }),
      ...overnightBooking,
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-21",
          reason: null,
          start_time: "00:30:00",
          end_time: "02:00:00",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.blackoutPartialDay");
  });

  it("allows an overnight booking when no blackout touches either segment", () => {
    const r = validateBooking({
      ...BASE_PARAMS,
      space: makeSpace({ max_duration_hours: 8 }),
      ...overnightBooking,
    });
    expect(r.valid).toBe(true);
  });
});

describe("validateBooking — timezone-aware day-of-week", () => {
  it("uses the building timezone (not the server clock) for day/time", () => {
    // Booking: 2026-04-21T02:00:00Z — Tuesday in UTC, but in America/Santo_Domingo
    // (UTC-4) it's 2026-04-20T22:00, which is Monday.
    // A recurring blackout on Monday 21:00–23:00 should still reject this.
    const r = validateBooking({
      ...BASE_PARAMS,
      timezone: "America/Santo_Domingo",
      space: makeSpace(),
      startTime: new Date("2026-04-21T02:00:00.000Z"),
      endTime: new Date("2026-04-21T03:00:00.000Z"),
      recurringBlackouts: [
        {
          id: "rb-tz",
          space_id: "00000000-0000-4000-8000-000000000001",
          day_of_week: 1, // Monday in the building's timezone
          start_time: "21:00:00",
          end_time: "23:00:00",
          reason: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.recurringBlackout");
  });

  it("matches blackout dates in the building timezone, not UTC", () => {
    // Same 02:00 UTC / 22:00 local Mon booking — full-day blackout on 2026-04-20
    // (the local Monday) should reject, even though the UTC date is 2026-04-21.
    const r = validateBooking({
      ...BASE_PARAMS,
      timezone: "America/Santo_Domingo",
      space: makeSpace(),
      startTime: new Date("2026-04-21T02:00:00.000Z"),
      endTime: new Date("2026-04-21T03:00:00.000Z"),
      blackouts: [
        {
          id: "b1",
          space_id: "00000000-0000-4000-8000-000000000001",
          date: "2026-04-20",
          reason: null,
          start_time: null,
          end_time: null,
        },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.errorKey).toBe("reservation.blackoutFullDay");
  });
});
