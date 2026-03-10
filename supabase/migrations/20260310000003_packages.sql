CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  tracking_number text,
  carrier text,
  description text NOT NULL,
  received_by uuid REFERENCES profiles(id),
  received_at timestamptz DEFAULT now(),
  picked_up_by uuid REFERENCES profiles(id),
  picked_up_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'picked_up')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_packages_building ON packages(building_id, status);
CREATE INDEX idx_packages_apartment ON packages(apartment_id, status);

CREATE TRIGGER set_packages_updated_at
  BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their apartment packages"
  ON packages FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND (
      EXISTS (SELECT 1 FROM apartment_owners ao WHERE ao.apartment_id = packages.apartment_id AND ao.profile_id = auth.uid())
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage packages"
  ON packages FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
