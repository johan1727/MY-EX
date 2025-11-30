-- ========================================
-- MIGRATION: Extended Onboarding Fields
-- Created: 2024-06-01
-- ========================================

-- Add new columns to users table for personalized onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS who_ended TEXT CHECK (who_ended IN ('me', 'them', 'mutual'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_mood INTEGER CHECK (current_mood BETWEEN 1 AND 10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS relationship_duration TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS main_struggles TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);

-- Add helpful comments
COMMENT ON COLUMN users.user_name IS 'User''s first name for personalization';
COMMENT ON COLUMN users.who_ended IS 'Who initiated the breakup: me, them, or mutual';
COMMENT ON COLUMN users.current_mood IS 'Initial mood score from 1 (terrible) to 10 (great)';
COMMENT ON COLUMN users.relationship_duration IS 'How long the relationship lasted (e.g., "1-3 years")';
COMMENT ON COLUMN users.main_struggles IS 'Array of user''s primary challenges (e.g., ["No contactarle", "Dormir bien"])';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed the extended onboarding flow';
