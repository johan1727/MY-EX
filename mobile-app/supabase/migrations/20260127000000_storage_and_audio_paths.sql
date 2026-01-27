-- Migration: Add Audio Storage Support
-- Description: Create storage bucket for voice samples and add path tracking column

-- 1. Create or ensure 'voice_samples' bucket exists
-- Note: Storage buckets are usually created via API or Dashboard, but policies can be done in SQL
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice_samples', 'voice_samples', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on Storage Objects
-- Commented out: This requires superuser/owner permissions. 
-- In Supabase, RLS on storage.objects is usually enabled by default.
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Storage Policies for 'voice_samples'
-- We verify policies don't exist to avoid errors on re-run


-- Policy: Users can upload their own files
CREATE POLICY "Users can upload own voice samples"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice_samples' AND
  auth.uid() = owner
);

-- Policy: Users can read their own files
CREATE POLICY "Users can view own voice samples"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice_samples' AND
  auth.uid() = owner
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own voice samples"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice_samples' AND
  auth.uid() = owner
);

-- 4. Add 'audio_paths' column to ex_profiles
ALTER TABLE public.ex_profiles 
ADD COLUMN IF NOT EXISTS audio_paths text[];

-- Comment
COMMENT ON COLUMN public.ex_profiles.audio_paths IS 'Array of Supabase Storage paths (e.g., user_id/filename) for voice cloning source files.';
