-- Tighten the document_acknowledgments INSERT policy.
--
-- The original policy (20260413000004) only enforced `profile_id = auth.uid()`,
-- which let any authenticated user insert an ack row for any document UUID —
-- including documents from a different building or documents that don't even
-- require acknowledgment. Application-layer server actions validate this, but
-- the database should be the final guard.
--
-- This policy now additionally requires the target document to belong to the
-- caller's building, be active, and actually require acknowledgment.

DROP POLICY IF EXISTS "Users create own acknowledgments" ON document_acknowledgments;

CREATE POLICY "Users create own acknowledgments"
  ON document_acknowledgments FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_acknowledgments.document_id
        AND d.building_id = public.get_my_building_id()
        AND d.requires_acknowledgment = true
        AND d.is_active = true
    )
  );
