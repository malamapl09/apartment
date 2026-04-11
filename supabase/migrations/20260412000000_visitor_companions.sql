-- Visitor companions: one visitor registration can now list multiple people
-- sharing a single access code. The primary guest stays on the visitors row;
-- additional people live here. The parent visitors.status is derived from
-- the combined check-in state of primary + all companions.

CREATE TABLE visitor_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  name text NOT NULL,
  id_number text,
  phone text,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  checked_out_at timestamptz,
  checked_out_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visitor_id, position)
);

CREATE INDEX idx_visitor_companions_visitor ON visitor_companions(visitor_id);

ALTER TABLE visitor_companions ENABLE ROW LEVEL SECURITY;

-- Residents see companions of visitors they registered, in their own building.
CREATE POLICY "Residents see own visitor companions"
  ON visitor_companions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visitors v
      WHERE v.id = visitor_companions.visitor_id
        AND v.registered_by = auth.uid()
        AND v.building_id = public.get_my_building_id()
    )
  );

-- Admins see all companions in their building.
CREATE POLICY "Admins see all visitor companions"
  ON visitor_companions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visitors v
      WHERE v.id = visitor_companions.visitor_id
        AND v.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Residents can add companions to their own expected visitors.
CREATE POLICY "Residents insert companions on own expected visitors"
  ON visitor_companions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM visitors v
      WHERE v.id = visitor_companions.visitor_id
        AND v.registered_by = auth.uid()
        AND v.building_id = public.get_my_building_id()
        AND v.status = 'expected'
    )
  );

-- Residents can delete companions from their own expected visitors.
CREATE POLICY "Residents delete companions on own expected visitors"
  ON visitor_companions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM visitors v
      WHERE v.id = visitor_companions.visitor_id
        AND v.registered_by = auth.uid()
        AND v.building_id = public.get_my_building_id()
        AND v.status = 'expected'
    )
  );

-- Admins can update any companion in their building (check-in / check-out).
CREATE POLICY "Admins update companions"
  ON visitor_companions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM visitors v
      WHERE v.id = visitor_companions.visitor_id
        AND v.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- ============================================================================
-- Atomic creation: visitors row + all companion rows in one transaction
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

-- ============================================================================
-- Recompute parent visitor.status after a member check-in or check-out.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recompute_visitor_status(p_visitor_id uuid)
RETURNS void
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
    RETURN;
  END IF;

  v_any_in := (v_primary_in IS NOT NULL) OR EXISTS (
    SELECT 1 FROM public.visitor_companions
    WHERE visitor_id = p_visitor_id AND checked_in_at IS NOT NULL
  );

  IF NOT v_any_in THEN
    RETURN;
  END IF;

  -- Are all arrived members also checked out?
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
  ELSIF v_status = 'expected' THEN
    UPDATE public.visitors SET status = 'checked_in' WHERE id = p_visitor_id;
  END IF;
END;
$$;
