-- Fix visitor access code uniqueness check
--
-- Problem: generate_visitor_access_code() was checking uniqueness only among
-- active visitors (status IN ('expected', 'checked_in')), but the visitors
-- table has a UNIQUE constraint on access_code across ALL rows. A code that
-- passed the function's filter could still collide with a checked_out,
-- expired, or cancelled row, causing the INSERT to fail with a unique
-- violation at the constraint level.
--
-- Fix: remove the status filter so the uniqueness check in the loop mirrors
-- exactly what the table-level UNIQUE constraint enforces.
--
-- Additionally, the code length is increased from 6 to 8 hex characters
-- (from md5 output) to reduce collision probability as the table grows.

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
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS (
      SELECT 1 FROM public.visitors WHERE access_code = v_code
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;
