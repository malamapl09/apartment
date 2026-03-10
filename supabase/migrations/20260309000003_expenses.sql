-- Expense/Fee Tracking tables
-- Fee types, charges per apartment, and payment records

-- Fee types defined per building
CREATE TABLE fee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('maintenance_fee', 'common_area', 'parking', 'special_assessment', 'other')),
  default_amount numeric(10,2) NOT NULL,
  is_recurring boolean DEFAULT true,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual charges generated per apartment
CREATE TABLE charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  fee_type_id uuid NOT NULL REFERENCES fee_types(id),
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(apartment_id, fee_type_id, period_month, period_year)
);

-- Payments recorded against charges
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES charges(id),
  building_id uuid NOT NULL REFERENCES buildings(id),
  apartment_id uuid NOT NULL REFERENCES apartments(id),
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text CHECK (payment_method IN ('bank_transfer', 'cash', 'check', 'other')),
  reference_number text,
  proof_url text,
  recorded_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fee_types_building ON fee_types(building_id) WHERE is_active = true;
CREATE INDEX idx_charges_building ON charges(building_id, period_year, period_month);
CREATE INDEX idx_charges_apartment ON charges(apartment_id, status);
CREATE INDEX idx_charges_status ON charges(building_id, status) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_charges_due_date ON charges(due_date) WHERE status = 'pending';
CREATE INDEX idx_payments_charge ON payments(charge_id);
CREATE INDEX idx_payments_apartment ON payments(apartment_id, payment_date);

CREATE TRIGGER set_fee_types_updated_at
  BEFORE UPDATE ON fee_types
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_charges_updated_at
  BEFORE UPDATE ON charges
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- RLS Policies
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Fee types: building members can view, admins can manage
CREATE POLICY "Building members can view fee types"
  ON fee_types FOR SELECT
  USING (building_id = public.get_my_building_id());

CREATE POLICY "Admins can manage fee types"
  ON fee_types FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Charges: residents see their own apartment, admins see all
CREATE POLICY "Users can view their apartment charges"
  ON charges FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND (
      EXISTS (
        SELECT 1 FROM apartment_owners ao
        WHERE ao.apartment_id = charges.apartment_id
          AND ao.profile_id = auth.uid()
      )
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage charges"
  ON charges FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Payments: same visibility as charges
CREATE POLICY "Users can view their apartment payments"
  ON payments FOR SELECT
  USING (
    building_id = public.get_my_building_id()
    AND (
      EXISTS (
        SELECT 1 FROM apartment_owners ao
        WHERE ao.apartment_id = payments.apartment_id
          AND ao.profile_id = auth.uid()
      )
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin', 'super_admin')
  );
