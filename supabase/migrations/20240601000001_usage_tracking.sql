-- Migration: Add usage tracking and subscription fields
-- Date: 2024-06-01

-- 1. Add subscription fields to profiles table (if not already present)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'survivor' CHECK (subscription_tier IN ('survivor', 'warrior', 'phoenix')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'expired', 'canceled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. Add usage tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS weekly_decoder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_decoder_reset_date DATE DEFAULT CURRENT_DATE;

-- 3. Create a function to reset daily counters automatically
-- This function can be called by a cron job or checked on every request
CREATE OR REPLACE FUNCTION check_and_reset_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset daily messages if date changed
    IF OLD.last_message_reset_date < CURRENT_DATE THEN
        NEW.daily_message_count := 0;
        NEW.last_message_reset_date := CURRENT_DATE;
    END IF;

    -- Reset weekly decoder if 7 days passed
    IF OLD.last_decoder_reset_date < CURRENT_DATE - INTERVAL '7 days' THEN
        NEW.weekly_decoder_count := 0;
        NEW.last_decoder_reset_date := CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to run before any update on profiles
DROP TRIGGER IF EXISTS trigger_reset_counters ON profiles;
CREATE TRIGGER trigger_reset_counters
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_and_reset_counters();

-- 5. Create RPC function to safely increment counters
CREATE OR REPLACE FUNCTION increment_usage(
    user_id UUID, 
    feature_type TEXT -- 'message' or 'decoder'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    limit_val INTEGER;
    user_tier TEXT;
BEGIN
    -- Get current user tier and counts
    SELECT subscription_tier, daily_message_count, weekly_decoder_count
    INTO user_tier, current_count, limit_val -- temp storage
    FROM profiles
    WHERE id = user_id;

    -- Define limits based on tier (hardcoded logic in SQL for safety)
    IF feature_type = 'message' THEN
        -- Warrior/Phoenix: Unlimited (-1)
        IF user_tier IN ('warrior', 'phoenix') THEN
            RETURN TRUE;
        END IF;
        
        -- Survivor: Limit 10
        IF current_count >= 10 THEN
            RETURN FALSE;
        END IF;

        -- Increment
        UPDATE profiles 
        SET daily_message_count = daily_message_count + 1 
        WHERE id = user_id;
        
        RETURN TRUE;

    ELSIF feature_type = 'decoder' THEN
        -- Warrior/Phoenix: Unlimited
        IF user_tier IN ('warrior', 'phoenix') THEN
            RETURN TRUE;
        END IF;

        -- Survivor: Limit 1
        SELECT weekly_decoder_count INTO current_count FROM profiles WHERE id = user_id;
        
        IF current_count >= 1 THEN
            RETURN FALSE;
        END IF;

        -- Increment
        UPDATE profiles 
        SET weekly_decoder_count = weekly_decoder_count + 1 
        WHERE id = user_id;
        
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
