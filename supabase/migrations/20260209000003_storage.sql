-- Storage Buckets and Policies Migration
-- Creates storage buckets for files and images with appropriate access policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('space-photos', 'space-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Space Photos Bucket Policies (public)
CREATE POLICY "Building members can view space photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'space-photos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can upload space photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'space-photos'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update space photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'space-photos'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete space photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'space-photos'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Payment Proofs Bucket Policies (private)
CREATE POLICY "Users can view their own payment proofs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND (
      -- User owns the reservation
      EXISTS (
        SELECT 1 FROM public.reservations
        WHERE reservations.user_id = auth.uid()
          AND reservations.payment_proof_url LIKE '%' || storage.objects.name
      )
      -- Or user is admin in the building
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Owners can upload payment proofs for their reservations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own payment proofs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-proofs'
    AND (
      EXISTS (
        SELECT 1 FROM public.reservations
        WHERE reservations.user_id = auth.uid()
          AND reservations.payment_proof_url LIKE '%' || storage.objects.name
      )
      OR public.get_my_role() IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete payment proofs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-proofs'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Documents Bucket Policies (private)
CREATE POLICY "Building members can view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Admins can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can update documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can delete documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND public.get_my_role() IN ('admin', 'super_admin')
  );

-- Avatars Bucket Policies (public)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
