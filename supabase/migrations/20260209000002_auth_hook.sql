-- Custom Access Token Hook Migration
-- Injects building_id and user_role into JWT claims for authorization

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_building_id uuid;
  user_role text;
BEGIN
  -- Extract existing claims from the event
  claims := event->'claims';

  -- Fetch user's building_id and role from profiles table
  SELECT p.building_id, p.role
  INTO user_building_id, user_role
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  -- If profile exists, inject building_id and user_role into JWT claims
  IF user_building_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{building_id}', to_jsonb(user_building_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  -- Update the event with modified claims
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant necessary permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke execute from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Comment explaining the hook
COMMENT ON FUNCTION public.custom_access_token_hook IS
  'Custom hook that injects building_id and user_role from profiles table into JWT claims during token generation. This enables efficient RLS policies without additional database queries.';
