-- Add pricing_type to public_spaces so buildings can choose between
-- hourly billing, a one-time flat fee, or a per-day charge. Existing
-- rows default to 'hourly' so behavior is preserved.
--
-- - hourly    : payment = duration_hours * hourly_rate
-- - flat_rate : payment = hourly_rate (one-time, regardless of duration)
-- - per_day   : payment = days_covered * hourly_rate (at least 1 day)
--
-- The `hourly_rate` column is reused as the generic "rate" to avoid a
-- schema migration across every consumer. The UI relabels it based on
-- pricing_type.

ALTER TABLE public_spaces
  ADD COLUMN pricing_type text NOT NULL DEFAULT 'hourly'
    CHECK (pricing_type IN ('hourly', 'flat_rate', 'per_day'));
