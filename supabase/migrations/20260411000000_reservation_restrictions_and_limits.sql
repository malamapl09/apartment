-- Reservation access control, partial-day blackouts, recurring blackouts, and hour caps
-- Ships three customer-requested features together:
--   1) infractions + user_restrictions (admin can block a resident from booking a space)
--   2) blackout_dates partial-day + new recurring_blackouts (replaces dead quiet_hours)
--   3) max_hours_per_{day,week,month}_per_user on public_spaces

-- ============================================================================
-- 1.1 Infractions log
-- ============================================================================
CREATE TABLE infractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public_spaces(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','major','severe')),
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_infractions_profile ON infractions(profile_id, occurred_at DESC);
CREATE INDEX idx_infractions_building ON infractions(building_id, occurred_at DESC);

ALTER TABLE infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage infractions"
  ON infractions FOR ALL
  USING (building_id = public.get_my_building_id() AND public.get_my_role() IN ('admin','super_admin'))
  WITH CHECK (building_id = public.get_my_building_id() AND public.get_my_role() IN ('admin','super_admin'));

CREATE POLICY "Users can view own infractions"
  ON infractions FOR SELECT
  USING (profile_id = auth.uid());

-- ============================================================================
-- 1.2 User restrictions (enforcement layer)
-- ============================================================================
CREATE TABLE user_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public_spaces(id) ON DELETE CASCADE,
  infraction_id uuid REFERENCES infractions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_user_restrictions_active_lookup
  ON user_restrictions(profile_id, space_id, starts_at, ends_at)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_user_restrictions_building
  ON user_restrictions(building_id, profile_id);

ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage restrictions"
  ON user_restrictions FOR ALL
  USING (building_id = public.get_my_building_id() AND public.get_my_role() IN ('admin','super_admin'))
  WITH CHECK (building_id = public.get_my_building_id() AND public.get_my_role() IN ('admin','super_admin'));

CREATE POLICY "Users can view own restrictions"
  ON user_restrictions FOR SELECT
  USING (profile_id = auth.uid());

-- ============================================================================
-- 1.3 Helper: fast active-restriction check for the booking action
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_active_restriction(
  p_profile_id uuid,
  p_space_id uuid,
  p_at timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_restrictions
    WHERE profile_id = p_profile_id
      AND revoked_at IS NULL
      AND starts_at <= p_at
      AND (ends_at IS NULL OR ends_at > p_at)
      AND (space_id IS NULL OR space_id = p_space_id)
  );
$$;

-- ============================================================================
-- 1.4 Helper: sum user's booked hours in day/week/month windows (TZ-aware)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_space_booked_hours(
  p_user_id uuid,
  p_space_id uuid,
  p_booking_start timestamptz,
  p_timezone text
) RETURNS TABLE(hours_today numeric, hours_week numeric, hours_month numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT
      (date_trunc('day',  p_booking_start AT TIME ZONE p_timezone)) AT TIME ZONE p_timezone AS day_start,
      (date_trunc('day',  p_booking_start AT TIME ZONE p_timezone) + interval '1 day')   AT TIME ZONE p_timezone AS day_end,
      (date_trunc('week', p_booking_start AT TIME ZONE p_timezone)) AT TIME ZONE p_timezone AS week_start,
      (date_trunc('week', p_booking_start AT TIME ZONE p_timezone) + interval '7 days')  AT TIME ZONE p_timezone AS week_end,
      (date_trunc('month',p_booking_start AT TIME ZONE p_timezone)) AT TIME ZONE p_timezone AS month_start,
      (date_trunc('month',p_booking_start AT TIME ZONE p_timezone) + interval '1 month') AT TIME ZONE p_timezone AS month_end
  )
  SELECT
    COALESCE(SUM(CASE WHEN r.start_time >= b.day_start   AND r.start_time < b.day_end
                      THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600 ELSE 0 END), 0)::numeric AS hours_today,
    COALESCE(SUM(CASE WHEN r.start_time >= b.week_start  AND r.start_time < b.week_end
                      THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600 ELSE 0 END), 0)::numeric AS hours_week,
    COALESCE(SUM(CASE WHEN r.start_time >= b.month_start AND r.start_time < b.month_end
                      THEN EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 3600 ELSE 0 END), 0)::numeric AS hours_month
  FROM public.reservations r
  CROSS JOIN bounds b
  WHERE r.user_id = p_user_id
    AND r.space_id = p_space_id
    AND r.status IN ('pending_payment','payment_submitted','confirmed');
$$;

-- ============================================================================
-- 1.5 Partial-day support for blackout_dates
-- ============================================================================
ALTER TABLE blackout_dates ADD COLUMN start_time time;
ALTER TABLE blackout_dates ADD COLUMN end_time   time;

-- Drop the unique constraint so multiple partial-day rows can share a date
ALTER TABLE blackout_dates DROP CONSTRAINT IF EXISTS blackout_dates_space_id_date_key;

ALTER TABLE blackout_dates ADD CONSTRAINT blackout_dates_time_range_check
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  );

CREATE INDEX IF NOT EXISTS idx_blackout_dates_space_date ON blackout_dates(space_id, date);

-- ============================================================================
-- 1.6 Recurring blackouts (replaces dead quiet_hours columns)
-- ============================================================================
CREATE TABLE recurring_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public_spaces(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat (matches availability_schedules)
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time) -- overnight windows stored as two rows by the server action
);

CREATE INDEX idx_recurring_blackouts_space ON recurring_blackouts(space_id, day_of_week);

ALTER TABLE recurring_blackouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurring blackouts"
  ON recurring_blackouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces s
      WHERE s.id = recurring_blackouts.space_id
        AND s.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin','super_admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public_spaces s
      WHERE s.id = recurring_blackouts.space_id
        AND s.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin','super_admin')
  );

CREATE POLICY "Authenticated users can view recurring blackouts in their building"
  ON recurring_blackouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces s
      WHERE s.id = recurring_blackouts.space_id
        AND s.building_id = public.get_my_building_id()
    )
  );

-- Migrate existing quiet_hours data (currently dead config, but preserve intent)
-- Same-day windows -> one row per weekday
INSERT INTO recurring_blackouts (space_id, day_of_week, start_time, end_time, reason)
SELECT s.id, d.day_of_week, s.quiet_hours_start, s.quiet_hours_end, 'Quiet hours (migrated)'
FROM public_spaces s
CROSS JOIN generate_series(0, 6) AS d(day_of_week)
WHERE s.quiet_hours_start IS NOT NULL
  AND s.quiet_hours_end   IS NOT NULL
  AND s.quiet_hours_end > s.quiet_hours_start;

-- Overnight windows -> two rows per weekday (start->23:59:59, 00:00->end)
INSERT INTO recurring_blackouts (space_id, day_of_week, start_time, end_time, reason)
SELECT s.id, d.day_of_week, s.quiet_hours_start, '23:59:59'::time, 'Quiet hours (migrated)'
FROM public_spaces s
CROSS JOIN generate_series(0, 6) AS d(day_of_week)
WHERE s.quiet_hours_start IS NOT NULL
  AND s.quiet_hours_end   IS NOT NULL
  AND s.quiet_hours_end <= s.quiet_hours_start;

INSERT INTO recurring_blackouts (space_id, day_of_week, start_time, end_time, reason)
SELECT s.id, d.day_of_week, '00:00:00'::time, s.quiet_hours_end, 'Quiet hours (migrated)'
FROM public_spaces s
CROSS JOIN generate_series(0, 6) AS d(day_of_week)
WHERE s.quiet_hours_start IS NOT NULL
  AND s.quiet_hours_end   IS NOT NULL
  AND s.quiet_hours_end <= s.quiet_hours_start;

ALTER TABLE public_spaces DROP COLUMN quiet_hours_start;
ALTER TABLE public_spaces DROP COLUMN quiet_hours_end;

-- ============================================================================
-- 1.7 Per-user hour caps on public_spaces
-- ============================================================================
ALTER TABLE public_spaces
  ADD COLUMN max_hours_per_day_per_user   numeric(5,2),
  ADD COLUMN max_hours_per_week_per_user  numeric(5,2),
  ADD COLUMN max_hours_per_month_per_user numeric(5,2);
