-- Documents table for building document sharing
-- Categories: rules, minutes, contracts, notices, forms

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('rules', 'minutes', 'contracts', 'notices', 'forms')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES documents(id),
  target text DEFAULT 'all' CHECK (target IN ('all', 'owners', 'residents')),
  uploaded_by uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_building ON documents(building_id, category);
CREATE INDEX idx_documents_building_active ON documents(building_id) WHERE is_active = true;

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building members can view documents"
  ON documents FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND is_active = true
    AND (
      target = 'all'
      OR (target = 'owners' AND public.get_my_role() IN ('admin', 'super_admin', 'owner'))
      OR (target = 'residents' AND public.get_my_role() IN ('admin', 'super_admin', 'resident'))
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
