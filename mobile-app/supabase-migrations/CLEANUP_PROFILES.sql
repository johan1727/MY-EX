-- Database Cleanup Migration
-- Drops unused tables and columns identified in code analysis (2026-01-29)

-- 1. Drop unused tables
-- [IMPORTANTE] Conservamos 'conversations' para usarla en el Chat del Coach (Ana)
DROP TABLE IF EXISTS public.ex_chat_history;
-- DROP TABLE IF EXISTS public.conversations; -- RESERVADA PARA COACH

-- 2. Drop unused columns from profiles
-- These data points are stored in ex_profiles or ex_profiles_master_prompt
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS voice_id,
DROP COLUMN IF EXISTS master_prompt,
DROP COLUMN IF EXISTS relationship_type;

-- 3. Reset limits for sync consistency (Optional, good for fresh start)
UPDATE public.profiles 
SET daily_message_count = 0 
WHERE daily_message_count IS NULL;
