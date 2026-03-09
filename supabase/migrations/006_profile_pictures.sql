-- Migration 006: Profile pictures and display name activation
-- Adds profile_picture_path to profiles and creates the profile-pictures storage bucket

-- Add profile picture path column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_picture_path TEXT NULL;

-- Create the profile-pictures storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read all profile pictures
CREATE POLICY "Authenticated users can read profile pictures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-pictures');

-- Users can only upload/replace/delete their own picture (folder = their user ID)
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own profile picture"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
