-- Row Level Security (RLS) Policies Migration
-- Enables RLS and creates security policies for all tables

-- Helper functions to get current user's building and role (in public schema)
CREATE OR REPLACE FUNCTION public.get_my_building_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT building_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Enable RLS on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Buildings policies
CREATE POLICY "Users can view their building"
  ON buildings FOR SELECT
  USING (id = public.get_my_building_id());

CREATE POLICY "Admins can update their building"
  ON buildings FOR UPDATE
  USING (
    id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Profiles policies
CREATE POLICY "Users can view profiles in their building"
  ON profiles FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles in their building"
  ON profiles FOR INSERT
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete profiles in their building"
  ON profiles FOR DELETE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Apartments policies
CREATE POLICY "Building members can view apartments"
  ON apartments FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Admins can insert apartments"
  ON apartments FOR INSERT
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update apartments"
  ON apartments FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete apartments"
  ON apartments FOR DELETE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Apartment owners policies
CREATE POLICY "Building members can view apartment owners"
  ON apartment_owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = apartment_owners.apartment_id
        AND apartments.building_id = public.get_my_building_id()
    )
  );

CREATE POLICY "Admins can insert apartment owners"
  ON apartment_owners FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = apartment_owners.apartment_id
        AND apartments.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update apartment owners"
  ON apartment_owners FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = apartment_owners.apartment_id
        AND apartments.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete apartment owners"
  ON apartment_owners FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM apartments
      WHERE apartments.id = apartment_owners.apartment_id
        AND apartments.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Public spaces policies
CREATE POLICY "Building members can view public spaces"
  ON public_spaces FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Admins can insert public spaces"
  ON public_spaces FOR INSERT
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update public spaces"
  ON public_spaces FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete public spaces"
  ON public_spaces FOR DELETE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Availability schedules policies
CREATE POLICY "Building members can view availability schedules"
  ON availability_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces
      WHERE public_spaces.id = availability_schedules.space_id
        AND public_spaces.building_id = public.get_my_building_id()
    )
  );

CREATE POLICY "Admins can manage availability schedules"
  ON availability_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces
      WHERE public_spaces.id = availability_schedules.space_id
        AND public_spaces.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Blackout dates policies
CREATE POLICY "Building members can view blackout dates"
  ON blackout_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces
      WHERE public_spaces.id = blackout_dates.space_id
        AND public_spaces.building_id = public.get_my_building_id()
    )
  );

CREATE POLICY "Admins can manage blackout dates"
  ON blackout_dates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public_spaces
      WHERE public_spaces.id = blackout_dates.space_id
        AND public_spaces.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Reservations policies
CREATE POLICY "Building members can view reservations"
  ON reservations FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Owners can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND building_id = public.get_my_building_id()
    AND status = 'pending_payment'
  );

CREATE POLICY "Users can update their own pending reservations"
  ON reservations FOR UPDATE
  USING (
    user_id = auth.uid()
    AND building_id = public.get_my_building_id()
  );

CREATE POLICY "Admins can manage all reservations"
  ON reservations FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Announcements policies
CREATE POLICY "Building members can view announcements"
  ON announcements FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Admins can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Admins can view audit logs for their building"
  ON audit_logs FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
