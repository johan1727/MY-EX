-- DIAGNOSTIC: Check and Fix RLS policies for ex_profiles
-- Run this in Supabase SQL Editor

-- Step 1: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'ex_profiles';

-- Step 2: Check existing policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ex_profiles';

-- Step 3: If no policies exist or you get empty results, run this:
-- (Comment out if policies already exist)

/*
-- Drop existing policies if corrupted
DROP POLICY IF EXISTS "Users can view own profiles" ON public.ex_profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON public.ex_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.ex_profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON public.ex_profiles;

-- Make sure RLS is enabled
ALTER TABLE public.ex_profiles ENABLE ROW LEVEL SECURITY;

-- Create fresh policies
CREATE POLICY "Users can view own profiles" ON public.ex_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles" ON public.ex_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON public.ex_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON public.ex_profiles
    FOR DELETE USING (auth.uid() = user_id);
*/

-- Step 4: Verify your specific user can see their profiles
-- Replace 'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b' with your user_id
SELECT 
    id,
    user_id,
    ex_name,
    message_count,
    created_at
FROM ex_profiles 
WHERE user_id = 'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b';

-- If Step 4 returns results but the app doesn't, the issue is in the app code
-- If Step 4 returns nothing, there might be a user_id mismatch

-- QUICK FIX: Temporarily disable RLS to test (NOT for production!)
-- ALTER TABLE public.ex_profiles DISABLE ROW LEVEL SECURITY;
