-- Migration: Create ex_profiles table for cloud sync
-- This table stores analyzed ex profiles tied to user accounts

-- Create the ex_profiles table
CREATE TABLE IF NOT EXISTS public.ex_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_name TEXT NOT NULL,
    profile_data JSONB NOT NULL DEFAULT '{}',
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_ex_profiles_user_id ON public.ex_profiles(user_id);

-- Enable RLS
ALTER TABLE public.ex_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profiles
CREATE POLICY "Users can view own profiles" ON public.ex_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own profiles
CREATE POLICY "Users can insert own profiles" ON public.ex_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profiles
CREATE POLICY "Users can update own profiles" ON public.ex_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own profiles
CREATE POLICY "Users can delete own profiles" ON public.ex_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ex_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ex_profiles_updated_at
    BEFORE UPDATE ON public.ex_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_ex_profiles_updated_at();

-- Grant permissions
GRANT ALL ON public.ex_profiles TO authenticated;
GRANT SELECT ON public.ex_profiles TO anon;
