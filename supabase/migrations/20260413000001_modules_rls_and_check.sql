-- Review fixes for 20260413000000_per_building_modules:
--   1) CHECK constraint blocks typos in enabled_modules (a stored "visitor"
--      instead of "visitors" would silently lock out users).
--   2) BEFORE UPDATE trigger restricts enabled_modules mutations to
--      super_admin. RLS lets regular admins UPDATE their building row; this
--      trigger enforces that only super_admin can touch the modules column.

ALTER TABLE buildings
  ADD CONSTRAINT enabled_modules_valid_values
  CHECK (
    enabled_modules <@ ARRAY[
      'reservations','visitors','maintenance','packages',
      'polls','documents','announcements','fees'
    ]::text[]
  );

CREATE OR REPLACE FUNCTION public.guard_building_enabled_modules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.enabled_modules IS DISTINCT FROM OLD.enabled_modules
     AND public.get_my_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Only super_admin can modify enabled_modules';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS buildings_enabled_modules_guard ON buildings;
CREATE TRIGGER buildings_enabled_modules_guard
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_building_enabled_modules();
