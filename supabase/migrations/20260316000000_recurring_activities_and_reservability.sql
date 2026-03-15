-- Add recurrence columns to space_activities
ALTER TABLE space_activities
  ADD COLUMN is_recurring boolean DEFAULT false,
  ADD COLUMN recurrence_pattern text CHECK (recurrence_pattern IN ('daily','weekly','monthly')),
  ADD COLUMN recurrence_end_date date,
  ADD COLUMN recurrence_group_id uuid;

CREATE INDEX idx_space_activities_recurrence_group
  ON space_activities(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

-- Add allow_reservations to public_spaces (default true preserves existing behavior)
ALTER TABLE public_spaces
  ADD COLUMN allow_reservations boolean DEFAULT true;

-- Drop unused requires_approval column
ALTER TABLE public_spaces DROP COLUMN IF EXISTS requires_approval;
