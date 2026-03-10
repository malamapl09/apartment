-- Maintenance Requests tables
-- Allows residents to submit maintenance issues, admins to track and assign

CREATE TABLE maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  apartment_id uuid REFERENCES apartments(id),
  requested_by uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'structural', 'pest_control', 'general')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed')),
  photos text[] DEFAULT '{}',
  assigned_to text,
  assigned_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reference_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE maintenance_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_maintenance_building_status ON maintenance_requests(building_id, status);
CREATE INDEX idx_maintenance_requested_by ON maintenance_requests(requested_by);
CREATE INDEX idx_maintenance_apartment ON maintenance_requests(apartment_id);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(building_id, priority) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX idx_maintenance_comments_request ON maintenance_comments(request_id, created_at);

CREATE TRIGGER set_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Reference code generation for maintenance requests (MR-YYYY-XXXX)
CREATE OR REPLACE FUNCTION generate_maintenance_reference_code()
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
    v_random := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    v_code := 'MR-' || v_year || '-' || v_random;
    SELECT EXISTS (
      SELECT 1 FROM public.maintenance_requests WHERE reference_code = v_code
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION set_maintenance_reference_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code = generate_maintenance_reference_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_maintenance_reference
  BEFORE INSERT ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_maintenance_reference_code();

-- Storage bucket for maintenance photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('maintenance-photos', 'maintenance-photos', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload maintenance photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'maintenance-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Building members can view maintenance photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'maintenance-photos' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Admins can delete maintenance photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'maintenance-photos' AND public.get_my_role() IN ('admin', 'super_admin'));

-- RLS Policies
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    AND building_id = public.get_my_building_id()
  );

CREATE POLICY "Admins can view all maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can create maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND building_id = public.get_my_building_id()
  );

CREATE POLICY "Admins can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can view comments on their requests"
  ON maintenance_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests mr
      WHERE mr.id = maintenance_comments.request_id
        AND mr.building_id = public.get_my_building_id()
        AND (
          (mr.requested_by = auth.uid() AND maintenance_comments.is_internal = false)
          OR public.get_my_role() IN ('admin', 'super_admin')
        )
    )
  );

CREATE POLICY "Users can add comments to their requests"
  ON maintenance_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM maintenance_requests mr
      WHERE mr.id = maintenance_comments.request_id
        AND mr.building_id = public.get_my_building_id()
        AND (mr.requested_by = auth.uid() OR public.get_my_role() IN ('admin', 'super_admin'))
    )
  );
