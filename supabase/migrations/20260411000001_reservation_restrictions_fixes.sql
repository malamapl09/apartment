-- Review fixes for 20260411000000_reservation_restrictions_and_limits:
--   1) Preserve audit trail: profile_id becomes nullable with ON DELETE SET NULL
--   2) Atomic infraction + optional restriction via a single RPC

-- ============================================================================
-- 1. Make profile_id nullable on both tables and change cascade -> set null
-- ============================================================================
-- infractions
ALTER TABLE infractions DROP CONSTRAINT infractions_profile_id_fkey;
ALTER TABLE infractions ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE infractions
  ADD CONSTRAINT infractions_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- user_restrictions
ALTER TABLE user_restrictions DROP CONSTRAINT user_restrictions_profile_id_fkey;
ALTER TABLE user_restrictions ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE user_restrictions
  ADD CONSTRAINT user_restrictions_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- When a profile is deleted, restrictions become orphaned (profile_id NULL).
-- has_active_restriction() still filters by profile_id = p_profile_id, so
-- these orphans are implicitly inactive. Admins can find them via building_id
-- for compliance review. Infractions remain as audit records.

-- ============================================================================
-- 2. Atomic RPC: create infraction + optional linked restriction in one txn
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_infraction_with_optional_restriction(
  p_building_id uuid,
  p_profile_id uuid,
  p_space_id uuid,
  p_occurred_at timestamptz,
  p_severity text,
  p_description text,
  p_created_by uuid,
  p_also_restrict boolean,
  p_restriction_reason text,
  p_restriction_ends_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_infraction_id uuid;
BEGIN
  INSERT INTO public.infractions (
    building_id, profile_id, space_id, occurred_at,
    severity, description, created_by
  ) VALUES (
    p_building_id, p_profile_id, p_space_id, p_occurred_at,
    p_severity, p_description, p_created_by
  )
  RETURNING id INTO v_infraction_id;

  IF p_also_restrict THEN
    INSERT INTO public.user_restrictions (
      building_id, profile_id, space_id, infraction_id,
      reason, ends_at, created_by
    ) VALUES (
      p_building_id, p_profile_id, p_space_id, v_infraction_id,
      COALESCE(NULLIF(p_restriction_reason, ''), p_description),
      p_restriction_ends_at, p_created_by
    );
  END IF;

  RETURN v_infraction_id;
END;
$$;
