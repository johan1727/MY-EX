-- POLICY: Allow users to update their own profile (Critical for Subscription Fallback)
-- First, drop existing policy if it's too restrictive (optional safety)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create comprehensive update policy
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions just in case
GRANT UPDATE ON profiles TO authenticated;
