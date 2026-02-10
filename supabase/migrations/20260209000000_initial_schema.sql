-- Initial Schema Migration
-- Creates all core tables, indexes, functions, and triggers

-- Buildings table
CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  total_units integer,
  bank_account_info jsonb,
  payment_deadline_hours integer DEFAULT 48,
  timezone text DEFAULT 'America/Santo_Domingo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES buildings(id),
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'owner', 'resident')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  national_id text,
  emergency_contact jsonb,
  avatar_url text,
  preferred_locale text DEFAULT 'es',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Apartments table
CREATE TABLE apartments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  unit_number text NOT NULL,
  floor integer,
  area_sqm numeric(8,2),
  bedrooms integer,
  bathrooms integer,
  status text DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(building_id, unit_number)
);

-- Apartment owners junction table
CREATE TABLE apartment_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  move_in_date date,
  move_out_date date,
  UNIQUE(apartment_id, profile_id)
);

-- Public spaces (amenities) table
CREATE TABLE public_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  name text NOT NULL,
  description text,
  capacity integer,
  photos text[],
  hourly_rate numeric(10,2) DEFAULT 0,
  deposit_amount numeric(10,2) DEFAULT 0,
  requires_approval boolean DEFAULT false,
  min_advance_hours integer DEFAULT 24,
  max_advance_days integer DEFAULT 30,
  max_duration_hours integer DEFAULT 8,
  max_monthly_per_owner integer DEFAULT 4,
  gap_minutes integer DEFAULT 60,
  quiet_hours_start time,
  quiet_hours_end time,
  cancellation_hours integer DEFAULT 24,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Availability schedules for public spaces
CREATE TABLE availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public_spaces(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  UNIQUE(space_id, day_of_week)
);

-- Blackout dates for public spaces
CREATE TABLE blackout_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public_spaces(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text,
  UNIQUE(space_id, date)
);

-- Reservations table
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  space_id uuid NOT NULL REFERENCES public_spaces(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'payment_submitted', 'confirmed', 'cancelled', 'completed', 'rejected')),
  reference_code text UNIQUE NOT NULL,
  payment_amount numeric(10,2),
  payment_proof_url text,
  payment_verified_by uuid REFERENCES profiles(id),
  payment_verified_at timestamptz,
  payment_rejected_reason text,
  payment_deadline timestamptz,
  cancellation_reason text,
  cancelled_by uuid REFERENCES profiles(id),
  notes text,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Announcements table
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  title text NOT NULL,
  body text NOT NULL,
  target text DEFAULT 'all' CHECK (target IN ('all', 'owners', 'residents')),
  created_by uuid REFERENCES profiles(id),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES buildings(id),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_building ON profiles(building_id);
CREATE INDEX idx_profiles_role ON profiles(building_id, role);
CREATE INDEX idx_apartments_building ON apartments(building_id);
CREATE INDEX idx_reservations_space_time ON reservations(space_id, start_time, end_time);
CREATE INDEX idx_reservations_building_status ON reservations(building_id, status);
CREATE INDEX idx_reservations_user ON reservations(user_id, status);
CREATE INDEX idx_reservations_deadline ON reservations(payment_deadline) WHERE status = 'pending_payment';
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_announcements_building ON announcements(building_id, published_at);

-- Function to check space availability
CREATE OR REPLACE FUNCTION check_space_availability(
  p_space_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_reservation_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_has_conflict boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE space_id = p_space_id
      AND status IN ('pending_payment', 'payment_submitted', 'confirmed')
      AND (id != p_exclude_reservation_id OR p_exclude_reservation_id IS NULL)

      AND (
        (start_time, end_time) OVERLAPS (p_start, p_end)
      )
  ) INTO v_has_conflict;

  RETURN NOT v_has_conflict;
END;
$$;

-- Function to generate reference codes
CREATE OR REPLACE FUNCTION generate_reference_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_year text;
  v_random text;
  v_code text;
  v_exists boolean;
BEGIN
  v_year := to_char(now(), 'YYYY');

  LOOP
    -- Generate 4 random alphanumeric characters
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    v_code := 'RH-' || v_year || '-' || v_random;

    -- Check if code already exists
    SELECT EXISTS (
      SELECT 1 FROM public.reservations WHERE reference_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER set_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_apartments_updated_at
  BEFORE UPDATE ON apartments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_public_spaces_updated_at
  BEFORE UPDATE ON public_spaces
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Trigger to auto-generate reference codes for reservations
CREATE OR REPLACE FUNCTION set_reservation_reference_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code = generate_reference_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_reservation_reference
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_reservation_reference_code();
