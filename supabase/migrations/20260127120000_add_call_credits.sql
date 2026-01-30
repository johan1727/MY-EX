-- Migration: Add Call Credits System
-- Description: Add call_credits column to profiles for purchasable extra minutes

-- Add call_credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS call_credits double precision DEFAULT 0;

-- Comment
COMMENT ON COLUMN public.profiles.call_credits IS 'Purchased extra minutes that can be used when monthly limit is exhausted (in minutes)';
