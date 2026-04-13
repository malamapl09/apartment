-- Document acknowledgment: admins can flag a document as requiring explicit
-- confirmation that each resident in the target audience has read it.

ALTER TABLE documents
  ADD COLUMN requires_acknowledgment boolean NOT NULL DEFAULT false;

CREATE TABLE document_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, profile_id)
);

CREATE INDEX idx_document_acks_document ON document_acknowledgments(document_id);
CREATE INDEX idx_document_acks_profile ON document_acknowledgments(profile_id);

ALTER TABLE document_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own acknowledgments"
  ON document_acknowledgments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users create own acknowledgments"
  ON document_acknowledgments FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins see all building acknowledgments"
  ON document_acknowledgments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_acknowledgments.document_id
        AND d.building_id = public.get_my_building_id()
    )
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- ============================================================================
-- RPC: who is in the audience for a given document (with ack status)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.document_audience(p_document_id uuid)
RETURNS TABLE(profile_id uuid, full_name text, email text, has_acked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    p.id AS profile_id,
    p.full_name,
    p.email,
    EXISTS (
      SELECT 1 FROM public.document_acknowledgments a
      WHERE a.document_id = p_document_id AND a.profile_id = p.id
    ) AS has_acked
  FROM public.documents d
  JOIN public.profiles p ON p.building_id = d.building_id
  WHERE d.id = p_document_id
    AND p.is_active = true
    AND p.role IN ('owner', 'resident')
    AND CASE
      WHEN d.target = 'owners'    THEN p.role = 'owner'
      WHEN d.target = 'residents' THEN p.role = 'resident'
      ELSE true
    END
  ORDER BY has_acked, p.full_name NULLS LAST;
$$;

-- ============================================================================
-- RPC: pending acks for the current resident (banner)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.my_pending_acknowledgments()
RETURNS TABLE(document_id uuid, title text, category text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT d.id AS document_id, d.title, d.category
  FROM public.documents d
  WHERE d.is_active = true
    AND d.requires_acknowledgment = true
    AND d.building_id = public.get_my_building_id()
    AND CASE
      WHEN d.target = 'owners'    THEN public.get_my_role() = 'owner'
      WHEN d.target = 'residents' THEN public.get_my_role() = 'resident'
      ELSE public.get_my_role() IN ('owner', 'resident')
    END
    AND NOT EXISTS (
      SELECT 1 FROM public.document_acknowledgments a
      WHERE a.document_id = d.id AND a.profile_id = auth.uid()
    )
  ORDER BY d.created_at DESC;
$$;
