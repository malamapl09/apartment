-- Review fix #2 for 20260413000002_visitor_gap_fixes:
--   is_visitor_blacklisted() now trims whitespace on every input before
--   comparing. Previously a resident submitting "  John Doe  " would bypass
--   the server-side blacklist check even if "John Doe" was blacklisted —
--   the JS helper was trimming but the RPC was not.

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
        (p_id_number IS NOT NULL
          AND trim(p_id_number) <> ''
          AND trim(id_number) = trim(p_id_number))
        OR (p_phone IS NOT NULL
          AND trim(p_phone) <> ''
          AND trim(phone) = trim(p_phone))
        OR lower(trim(name)) = lower(trim(p_name))
      )
  );
$$;
