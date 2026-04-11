-- Review fixes for 20260412000000_visitor_companions:
--   1) recompute_visitor_status returns boolean (was_first_arrival), letting
--      the server action gate notifications under the FOR UPDATE lock —
--      eliminates the duplicate-email race when two staff check in companions
--      simultaneously.
--   2) New check_in_visitor_group / check_out_visitor_group SQL functions
--      stamp parent + all companions atomically inside one transaction.
--   3) create_visitor_with_companions enforces a hard 20-companion cap so
--      direct RPC clients cannot bypass the Zod limit.

-- ============================================================================
-- 1. recompute_visitor_status now returns the first-arrival flag
-- ============================================================================
DROP FUNCTION IF EXISTS public.recompute_visitor_status(uuid);

CREATE OR REPLACE FUNCTION public.recompute_visitor_status(p_visitor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_primary_in timestamptz;
  v_primary_out timestamptz;
  v_any_in boolean;
  v_all_done boolean;
BEGIN
  SELECT status, checked_in_at, checked_out_at
  INTO v_status, v_primary_in, v_primary_out
  FROM public.visitors
  WHERE id = p_visitor_id
  FOR UPDATE;

  IF v_status NOT IN ('expected', 'checked_in') THEN
    RETURN false;
  END IF;

  v_any_in := (v_primary_in IS NOT NULL) OR EXISTS (
    SELECT 1 FROM public.visitor_companions
    WHERE visitor_id = p_visitor_id AND checked_in_at IS NOT NULL
  );

  IF NOT v_any_in THEN
    RETURN false;
  END IF;

  v_all_done := NOT EXISTS (
    SELECT 1
    FROM (
      SELECT v_primary_in AS in_at, v_primary_out AS out_at
      WHERE v_primary_in IS NOT NULL
      UNION ALL
      SELECT checked_in_at, checked_out_at
      FROM public.visitor_companions
      WHERE visitor_id = p_visitor_id AND checked_in_at IS NOT NULL
    ) arrived
    WHERE arrived.out_at IS NULL
  );

  IF v_all_done THEN
    UPDATE public.visitors SET status = 'checked_out' WHERE id = p_visitor_id;
    RETURN false;
  ELSIF v_status = 'expected' THEN
    UPDATE public.visitors SET status = 'checked_in' WHERE id = p_visitor_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- 2. Atomic group check-in / check-out
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_in_visitor_group(
  p_visitor_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := now();
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.visitors WHERE id = p_visitor_id;
  IF v_status NOT IN ('expected', 'checked_in') THEN
    RAISE EXCEPTION 'visitor_not_actionable';
  END IF;

  UPDATE public.visitors
  SET checked_in_at = v_now, checked_in_by = p_user_id
  WHERE id = p_visitor_id AND checked_in_at IS NULL;

  UPDATE public.visitor_companions
  SET checked_in_at = v_now, checked_in_by = p_user_id
  WHERE visitor_id = p_visitor_id AND checked_in_at IS NULL;

  RETURN public.recompute_visitor_status(p_visitor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_out_visitor_group(
  p_visitor_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := now();
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.visitors WHERE id = p_visitor_id;
  IF v_status NOT IN ('expected', 'checked_in') THEN
    RAISE EXCEPTION 'visitor_not_actionable';
  END IF;

  UPDATE public.visitors
  SET checked_out_at = v_now, checked_out_by = p_user_id
  WHERE id = p_visitor_id
    AND checked_in_at IS NOT NULL
    AND checked_out_at IS NULL;

  UPDATE public.visitor_companions
  SET checked_out_at = v_now, checked_out_by = p_user_id
  WHERE visitor_id = p_visitor_id
    AND checked_in_at IS NOT NULL
    AND checked_out_at IS NULL;

  PERFORM public.recompute_visitor_status(p_visitor_id);
END;
$$;

-- ============================================================================
-- 3. Hard cap on companion count in create_visitor_with_companions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_visitor_with_companions(
  p_building_id uuid,
  p_apartment_id uuid,
  p_registered_by uuid,
  p_primary jsonb,
  p_companions jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_visitor_id uuid;
  v_comp jsonb;
  v_pos smallint := 1;
BEGIN
  IF p_companions IS NOT NULL
     AND jsonb_typeof(p_companions) = 'array'
     AND jsonb_array_length(p_companions) > 20 THEN
    RAISE EXCEPTION 'companions_limit_exceeded';
  END IF;

  INSERT INTO public.visitors (
    building_id, apartment_id, registered_by,
    visitor_name, visitor_id_number, visitor_phone,
    vehicle_plate, vehicle_description, purpose, notes,
    valid_from, valid_until,
    is_recurring, recurrence_pattern, recurrence_end_date,
    status
  ) VALUES (
    p_building_id, p_apartment_id, p_registered_by,
    p_primary->>'name',
    NULLIF(p_primary->>'id_number', ''),
    NULLIF(p_primary->>'phone', ''),
    NULLIF(p_primary->>'vehicle_plate', ''),
    NULLIF(p_primary->>'vehicle_description', ''),
    NULLIF(p_primary->>'purpose', ''),
    NULLIF(p_primary->>'notes', ''),
    (p_primary->>'valid_from')::timestamptz,
    (p_primary->>'valid_until')::timestamptz,
    COALESCE((p_primary->>'is_recurring')::boolean, false),
    NULLIF(p_primary->>'recurrence_pattern', ''),
    NULLIF(p_primary->>'recurrence_end_date', '')::date,
    'expected'
  )
  RETURNING id INTO v_visitor_id;

  IF p_companions IS NOT NULL AND jsonb_typeof(p_companions) = 'array' THEN
    FOR v_comp IN SELECT * FROM jsonb_array_elements(p_companions)
    LOOP
      INSERT INTO public.visitor_companions (visitor_id, position, name, id_number, phone)
      VALUES (
        v_visitor_id, v_pos,
        v_comp->>'name',
        NULLIF(v_comp->>'id_number', ''),
        NULLIF(v_comp->>'phone', '')
      );
      v_pos := v_pos + 1;
    END LOOP;
  END IF;

  RETURN v_visitor_id;
END;
$$;
