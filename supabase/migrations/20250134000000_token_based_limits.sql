-- Migration: Update to Token-Based Limits and Fix Profiles Table
-- Date: 2025-12-01
-- Description: Adds missing subscription fields to profiles and migrates from message-based to token-based usage limits

-- 1. Add missing subscription fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT NOW();

-- 2. Create token_usage_tracking table
CREATE TABLE IF NOT EXISTS token_usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'chat', 'ex_simulator', 'decoder', 'journal'
    tokens_used INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 1, -- For reference
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE token_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'token_usage_tracking' AND policyname = 'Users can view own token usage') THEN
        CREATE POLICY "Users can view own token usage" ON token_usage_tracking FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'token_usage_tracking' AND policyname = 'Users can insert own token usage') THEN
        CREATE POLICY "Users can insert own token usage" ON token_usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_user_feature ON token_usage_tracking(user_id, feature, window_start);

-- 3. Create or replace increment_token_usage function
DROP FUNCTION IF EXISTS increment_token_usage(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION increment_token_usage(
    p_user_id UUID,
    p_feature_type TEXT,
    p_tokens_used INTEGER DEFAULT 0
)
RETURNS TABLE(
    allowed BOOLEAN,
    remaining_tokens INTEGER,
    reset_in_minutes INTEGER,
    limit_type TEXT,
    tier TEXT
) AS $$
DECLARE
    v_tier TEXT;
    v_daily_token_limit INTEGER;
    v_hourly_token_limit INTEGER;
    v_current_daily_tokens INTEGER;
    v_current_hourly_tokens INTEGER;
    v_oldest_window TIMESTAMPTZ;
    v_minutes_until_reset INTEGER;
BEGIN
    -- Get subscription tier
    SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM profiles
    WHERE id = p_user_id;

    -- Set TOKEN limits based on tier (pool-based, all features share)
    CASE v_tier
        WHEN 'warrior' THEN
            v_daily_token_limit := 150000;  -- ~150k tokens/day
            v_hourly_token_limit := 40000;  -- ~40k tokens/3hr
        WHEN 'premium' THEN
            v_daily_token_limit := 400000;  -- ~400k tokens/day
            v_hourly_token_limit := 100000; -- ~100k tokens/3hr
        WHEN 'phoenix' THEN
            v_daily_token_limit := 1200000; -- ~1.2M tokens/day
            v_hourly_token_limit := 300000; -- ~300k tokens/3hr
        ELSE -- free
            v_daily_token_limit := 10000;   -- ~10k tokens/day
            v_hourly_token_limit := 10000;  -- ~10k tokens/3hr
    END CASE;

    -- Check hourly limit (3-hour window) - ALL features combined
    SELECT COALESCE(SUM(tokens_used), 0), MIN(window_start) INTO v_current_hourly_tokens, v_oldest_window
    FROM token_usage_tracking
    WHERE user_id = p_user_id
    AND window_start > NOW() - INTERVAL '3 hours';

    IF v_current_hourly_tokens + p_tokens_used >= v_hourly_token_limit THEN
        -- Calculate minutes until oldest window expires
        v_minutes_until_reset := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_window + INTERVAL '3 hours' - NOW()))::INTEGER / 60);
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'hourly'::TEXT,
            v_tier;
        RETURN;
    END IF;

    -- Check daily limit - ALL features combined
    SELECT COALESCE(SUM(tokens_used), 0) INTO v_current_daily_tokens
    FROM token_usage_tracking
    WHERE user_id = p_user_id
    AND window_start > CURRENT_DATE;

    IF v_current_daily_tokens + p_tokens_used >= v_daily_token_limit THEN
        -- Calculate minutes until midnight
        v_minutes_until_reset := EXTRACT(EPOCH FROM (CURRENT_DATE + INTERVAL '1 day' - NOW()))::INTEGER / 60;
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'daily'::TEXT,
            v_tier;
        RETURN;
    END IF;

    -- Increment token usage
    INSERT INTO token_usage_tracking (user_id, feature, tokens_used, window_start)
    VALUES (p_user_id, p_feature_type, p_tokens_used, NOW());

    -- Clean old tracking records (older than 1 day)
    DELETE FROM token_usage_tracking
    WHERE window_start < NOW() - INTERVAL '1 day';

    RETURN QUERY SELECT 
        TRUE, 
        v_daily_token_limit - v_current_daily_tokens - p_tokens_used, 
        0,
        'none'::TEXT,
        v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create helper function to get tier token limits
CREATE OR REPLACE FUNCTION get_tier_token_limits(p_tier TEXT)
RETURNS TABLE(
    daily_token_limit INTEGER,
    hourly_token_limit INTEGER,
    window_hours INTEGER
) AS $$
BEGIN
    CASE p_tier
        WHEN 'warrior' THEN
            RETURN QUERY SELECT 150000, 40000, 3;
        WHEN 'premium' THEN
            RETURN QUERY SELECT 400000, 100000, 3;
        WHEN 'phoenix' THEN
            RETURN QUERY SELECT 1200000, 300000, 3;
        ELSE -- free
            RETURN QUERY SELECT 10000, 10000, 3;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON token_usage_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION increment_token_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_token_limits TO authenticated;

-- 6. Comment for documentation
COMMENT ON TABLE token_usage_tracking IS 'Tracks token usage per user per feature with rolling windows';
COMMENT ON FUNCTION increment_token_usage IS 'Increments token usage and checks against tier limits. Returns allowed status and remaining tokens.';
COMMENT ON FUNCTION get_tier_token_limits IS 'Returns token limits for a given subscription tier';
