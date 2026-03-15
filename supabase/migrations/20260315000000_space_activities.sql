-- Space Activities: non-blocking activity log for common spaces
-- Residents can signal "I'll be at the gym with my trainer from 10-11am"
-- without making a full reservation that blocks others.

CREATE TABLE space_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  space_id uuid NOT NULL REFERENCES public_spaces(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT space_activities_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_space_activities_space_time ON space_activities(space_id, start_time);
CREATE INDEX idx_space_activities_building_status ON space_activities(building_id, status);
CREATE INDEX idx_space_activities_user ON space_activities(user_id);

CREATE TRIGGER set_space_activities_updated_at
  BEFORE UPDATE ON space_activities
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS Policies
ALTER TABLE space_activities ENABLE ROW LEVEL SECURITY;

-- All building members can view activities
CREATE POLICY "Building members can view activities"
  ON space_activities FOR SELECT
  USING (building_id = public.get_my_building_id());

-- Users can create their own activities
CREATE POLICY "Users can create activities"
  ON space_activities FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND building_id = public.get_my_building_id()
  );

-- Users can update their own active activities
CREATE POLICY "Users can update their own activities"
  ON space_activities FOR UPDATE
  USING (
    user_id = auth.uid()
    AND building_id = public.get_my_building_id()
    AND status = 'active'
  );

-- Admins can update any activity in their building
CREATE POLICY "Admins can update all activities"
  ON space_activities FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE space_activities;
