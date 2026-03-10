-- Visitor Management table
-- Pre-register guests, generate access codes, track check-in/check-out

CREATE TABLE visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  registered_by uuid NOT NULL REFERENCES profiles(id),
  visitor_name text NOT NULL,
  visitor_id_number text,
  visitor_phone text,
  vehicle_plate text,
  vehicle_description text,
  purpose text,
  access_code text UNIQUE NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly') OR recurrence_pattern IS NULL),
  recurrence_end_date date,
  status text NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'checked_in', 'checked_out', 'expired', 'cancelled')),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  checked_in_by uuid REFERENCES profiles(id),
  checked_out_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_visitors_building ON visitors(building_id, status);
CREATE INDEX idx_visitors_apartment ON visitors(apartment_id);
CREATE INDEX idx_visitors_registered_by ON visitors(registered_by);
CREATE INDEX idx_visitors_access_code ON visitors(access_code);
CREATE INDEX idx_visitors_date_range ON visitors(building_id, valid_from, valid_until);

CREATE TRIGGER set_visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Access code generation (6-character alphanumeric)
CREATE OR REPLACE FUNCTION generate_visitor_access_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS (
      SELECT 1 FROM public.visitors WHERE access_code = v_code AND status IN ('expected', 'checked_in')
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION set_visitor_access_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
    NEW.access_code = generate_visitor_access_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_visitor_access
  BEFORE INSERT ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION set_visitor_access_code();

-- RLS Policies
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visitors"
  ON visitors FOR SELECT
  USING (
    registered_by = auth.uid()
    AND building_id = public.get_my_building_id()
  );

CREATE POLICY "Admins can view all visitors"
  ON visitors FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can register visitors"
  ON visitors FOR INSERT
  WITH CHECK (
    registered_by = auth.uid()
    AND building_id = public.get_my_building_id()
  );

CREATE POLICY "Users can update their own expected visitors"
  ON visitors FOR UPDATE
  USING (
    registered_by = auth.uid()
    AND building_id = public.get_my_building_id()
    AND status = 'expected'
  );

CREATE POLICY "Admins can update all visitors"
  ON visitors FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
