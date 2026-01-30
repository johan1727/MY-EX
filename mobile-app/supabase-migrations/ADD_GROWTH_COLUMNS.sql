-- GROWTH PACK MIGRATION (2026-01-29)
-- Adds columns for engagement tracking and server-side notifications.

-- 1. Add 'push_token' to profiles (Stores the Expo Push Token for notifications)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token text,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- 2. Add 'timezone' to user_settings (For scheduling notifications at user's local time)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- 3. Create index for fast filtering of inactive users (Retention Campaigns)
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at);

-- 4. Create index for fast filtering by timezone (Scheduling)
CREATE INDEX IF NOT EXISTS idx_user_settings_timezone ON public.user_settings(timezone);

-- Comment:
-- Run this script in the Supabase SQL Editor.
-- After running, we need to update 'notificationService.ts' and 'App.tsx' to save this data.
