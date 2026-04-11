-- Per-building module toggles. Each building can hide modules it does not
-- need (e.g. a building with no shared amenities can hide reservations).
-- The canonical module list lives in lib/modules.ts on the application side;
-- the array can shrink (super-admin disables one) but the default is all on.

ALTER TABLE buildings
  ADD COLUMN enabled_modules text[] NOT NULL DEFAULT ARRAY[
    'reservations','visitors','maintenance','packages',
    'polls','documents','announcements','fees'
  ];

-- Backfill: existing rows kept all-modules-on so this change is invisible
-- until a super-admin actively disables something. (The DEFAULT only applies
-- to new INSERTs, but the NOT NULL constraint forces a value, so existing
-- rows already got the default during the column add.)

CREATE OR REPLACE FUNCTION public.is_module_enabled(p_building_id uuid, p_module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p_module = ANY(enabled_modules)
  FROM public.buildings WHERE id = p_building_id;
$$;
