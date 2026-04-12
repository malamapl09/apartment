-- Visitor module gap fixes:
--   1) Make visitors.registered_by / checked_in_by / checked_out_by
--      nullable with ON DELETE SET NULL so deleting a resident preserves
--      the visitor audit record (matches the pattern used on
--      infractions / user_restrictions / visitor_companions).
--   2) New visitor_blacklist table so admins can block specific people
--      (by name / id / phone) from being registered as visitors.
--   3) is_visitor_blacklisted RPC: one-call match for the resident form.
--   4) expire_passed_visitors RPC: helper for the daily cron.

-- ============================================================================
-- 1. FK cascades for profile deletes
-- ============================================================================
ALTER TABLE visitors DROP CONSTRAINT visitors_registered_by_fkey;
ALTER TABLE visitors ALTER COLUMN registered_by DROP NOT NULL;
ALTER TABLE visitors
  ADD CONSTRAINT visitors_registered_by_fkey
  FOREIGN KEY (registered_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE visitors DROP CONSTRAINT visitors_checked_in_by_fkey;
ALTER TABLE visitors
  ADD CONSTRAINT visitors_checked_in_by_fkey
  FOREIGN KEY (checked_in_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE visitors DROP CONSTRAINT visitors_checked_out_by_fkey;
ALTER TABLE visitors
  ADD CONSTRAINT visitors_checked_out_by_fkey
  FOREIGN KEY (checked_out_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. visitor_blacklist table
-- ============================================================================
CREATE TABLE visitor_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  id_number text,
  phone text,
  reason text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_blacklist_building ON visitor_blacklist(building_id);
CREATE INDEX idx_visitor_blacklist_id_number
  ON visitor_blacklist(building_id, id_number) WHERE id_number IS NOT NULL;
CREATE INDEX idx_visitor_blacklist_phone
  ON visitor_blacklist(building_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_visitor_blacklist_name_lower
  ON visitor_blacklist(building_id, (lower(name)));

ALTER TABLE visitor_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage visitor blacklist"
  ON visitor_blacklist FOR ALL
  USING (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin','super_admin')
  )
  WITH CHECK (
    building_id = public.get_my_building_id()
    AND public.get_my_role() IN ('admin','super_admin')
  );

-- ============================================================================
-- 3. Matching RPC — called from registerVisitor before insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_visitor_blacklisted(
  p_building_id uuid,
  p_name text,
  p_id_number text,
  p_phone text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visitor_blacklist
    WHERE building_id = p_building_id
      AND (
        (p_id_number IS NOT NULL AND p_id_number <> '' AND id_number = p_id_number)
        OR (p_phone IS NOT NULL AND p_phone <> '' AND phone = p_phone)
        OR lower(name) = lower(p_name)
      )
  );
$$;

-- ============================================================================
-- 4. Auto-expire helper (cron route calls direct SQL but this is a utility)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_passed_visitors()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.visitors
    SET status = 'expired'
    WHERE status = 'expected'
      AND valid_until < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
