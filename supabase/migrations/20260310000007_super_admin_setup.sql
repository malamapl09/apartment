-- Public RPC to check if any buildings exist (used by setup wizard)
-- SECURITY DEFINER so it can query buildings despite RLS
CREATE OR REPLACE FUNCTION public.has_any_buildings()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.buildings LIMIT 1)
$$;

-- Allow anonymous and authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.has_any_buildings() TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_buildings() TO authenticated;
