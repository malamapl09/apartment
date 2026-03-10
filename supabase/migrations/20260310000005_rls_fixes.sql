-- RLS Policy Security Fixes
-- Addresses five critical vulnerabilities identified in the original RLS and storage policies.
--
-- Changes:
--   1. profiles UPDATE   — add WITH CHECK to prevent self-elevation of role, building_id, is_active
--   2. notifications INSERT — drop permissive WITH CHECK (true); inserts go through admin client (bypasses RLS)
--   3. audit_logs INSERT    — same treatment
--   4. reservations UPDATE  — restrict USING to actionable statuses; add WITH CHECK limiting allowed transitions
--   5. storage payment-proofs SELECT/UPDATE — replace LIKE suffix match with folder-prefix ownership check


-- ============================================================
-- 1. Profiles UPDATE
-- Prevents a user from self-modifying role, building_id, or
-- is_active by locking the new values to whatever the row
-- already contains at the time of the update.
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role       = (SELECT p.role        FROM profiles p WHERE p.id = auth.uid())
    AND building_id = (SELECT p.building_id FROM profiles p WHERE p.id = auth.uid())
    AND is_active  = (SELECT p.is_active   FROM profiles p WHERE p.id = auth.uid())
  );


-- ============================================================
-- 2. Notifications INSERT
-- WITH CHECK (true) allowed any authenticated user to insert
-- notifications for any user_id. Dropped — inserts are
-- performed exclusively via the service-role admin client
-- which bypasses RLS.
-- ============================================================
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;


-- ============================================================
-- 3. Audit logs INSERT
-- Same issue as notifications. Dropped for the same reason.
-- ============================================================
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;


-- ============================================================
-- 4. Reservations UPDATE
-- Old USING had no status filter, allowing users to update
-- reservations in any state (including confirmed/cancelled).
-- New policy:
--   USING  — only rows the user owns that are still mutable
--   WITH CHECK — only the statuses a resident is permitted to
--                write (cannot self-approve; can cancel)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own pending reservations" ON reservations;

CREATE POLICY "Users can update their own pending reservations" ON reservations
  FOR UPDATE
  USING (
    user_id     = auth.uid()
    AND building_id = public.get_my_building_id()
    AND status  IN ('pending_payment', 'payment_submitted')
  )
  WITH CHECK (
    user_id     = auth.uid()
    AND building_id = public.get_my_building_id()
    AND status  IN ('pending_payment', 'payment_submitted', 'cancelled')
  );


-- ============================================================
-- 5. Storage — payment-proofs SELECT & UPDATE
--
-- Vulnerability: both policies used
--   reservations.payment_proof_url LIKE '%' || storage.objects.name
-- which is a suffix match on the raw filename. Because the
-- match is not anchored to a full path, user A could upload
-- "receipt.pdf" and user B's reservation URL ending in
-- "receipt.pdf" would satisfy the predicate, granting
-- cross-user read/write access to the object.
--
-- Fix: mirror the avatars bucket pattern. Files must be stored
-- under {user_id}/{filename}. Ownership is verified by
-- comparing (storage.foldername(name))[1] — the first path
-- segment — against auth.uid()::text. Admins retain access via
-- the role check.
-- ============================================================

-- SELECT
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;

CREATE POLICY "Users can view their own payment proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      -- Owner: first path segment must be the authenticated user's UUID
      auth.uid()::text = (storage.foldername(name))[1]
      -- Admin: any admin in any building retains full read access
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update their own payment proofs" ON storage.objects;

CREATE POLICY "Users can update their own payment proofs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );
