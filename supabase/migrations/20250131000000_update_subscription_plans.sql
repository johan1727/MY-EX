-- Update Subscription Plans and Rate Limiting
-- Adds Phoenix tier, hourly limits, and increased usage quotas

-- 1. Add Phoenix tier to subscription_tier enum (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_enum') THEN
        CREATE TYPE subscription_tier_enum AS ENUM ('free', 'warrior', 'premium', 'phoenix');
    ELSE
        -- Add phoenix if it doesn't exist
        BEGIN
            ALTER TYPE subscription_tier_enum ADD VALUE IF NOT EXISTS 'phoenix';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. Create user_usage_tracking table for hourly limits
CREATE TABLE IF NOT EXISTS user_usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'chat', 'ex_simulator', 'decoder'
    usage_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_usage_tracking' AND policyname = 'Users can view own usage') THEN
        CREATE POLICY "Users can view own usage" ON user_usage_tracking FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_usage_tracking' AND policyname = 'Users can insert own usage') THEN
        CREATE POLICY "Users can insert own usage" ON user_usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_feature ON user_usage_tracking(user_id, feature, window_start);

-- 3. Drop and recreate increment_usage function with new return type
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT);

CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_feature_type TEXT
)
RETURNS TABLE(
    allowed BOOLEAN,
    remaining INTEGER,
    reset_in_minutes INTEGER,
    limit_type TEXT
) AS $$
DECLARE
    v_tier TEXT;
    v_daily_limit INTEGER;
    v_hourly_limit INTEGER;
    v_current_daily_usage INTEGER;
    v_current_hourly_usage INTEGER;
    v_oldest_window TIMESTAMPTZ;
    v_minutes_until_reset INTEGER;
BEGIN
    -- Get subscription tier
    SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM profiles
    WHERE id = p_user_id;

    -- Set POOL limits (all features share the same pool)
    CASE v_tier
        WHEN 'warrior' THEN
            v_daily_limit := 150;
            v_hourly_limit := 40;
        WHEN 'premium' THEN
            v_daily_limit := 400;
            v_hourly_limit := 100;
        WHEN 'phoenix' THEN
            v_daily_limit := 1200;
            v_hourly_limit := 300;
        ELSE -- free
            v_daily_limit := 10;
            v_hourly_limit := 10;
    END CASE;

    -- Check hourly limit (3-hour window) - ALL features combined
    SELECT COALESCE(SUM(usage_count), 0), MIN(window_start) INTO v_current_hourly_usage, v_oldest_window
    FROM user_usage_tracking
    WHERE user_id = p_user_id
    AND window_start > NOW() - INTERVAL '3 hours';

    IF v_current_hourly_usage >= v_hourly_limit THEN
        -- Calculate minutes until oldest window expires
        v_minutes_until_reset := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_window + INTERVAL '3 hours' - NOW()))::INTEGER / 60);
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'hourly'::TEXT;
        RETURN;
    END IF;

    -- Check daily limit - ALL features combined
    SELECT COALESCE(SUM(usage_count), 0) INTO v_current_daily_usage
    FROM usage_limits
    WHERE user_id = p_user_id
    AND last_reset_at > CURRENT_DATE;

    IF v_current_daily_usage >= v_daily_limit THEN
        -- Calculate minutes until midnight
        v_minutes_until_reset := EXTRACT(EPOCH FROM (CURRENT_DATE + INTERVAL '1 day' - NOW()))::INTEGER / 60;
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'daily'::TEXT;
        RETURN;
    END IF;

    -- Increment usage (pool-based, not feature-specific)
    INSERT INTO usage_limits (user_id, feature_type, usage_count, last_reset_at)
    VALUES (p_user_id, 'pool', 1, CURRENT_DATE)
    ON CONFLICT (user_id, feature_type)
    DO UPDATE SET 
        usage_count = CASE 
            WHEN usage_limits.last_reset_at < CURRENT_DATE THEN 1
            ELSE usage_limits.usage_count + 1
        END,
        last_reset_at = CURRENT_DATE;

    -- Track hourly usage (pool-based)
    INSERT INTO user_usage_tracking (user_id, feature, usage_count, window_start)
    VALUES (p_user_id, 'pool', 1, NOW());

    -- Clean old tracking records (older than 3 hours)
    DELETE FROM user_usage_tracking
    WHERE window_start < NOW() - INTERVAL '3 hours';

    RETURN QUERY SELECT 
        TRUE, 
        v_daily_limit - v_current_daily_usage - 1, 
        0,
        'none'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update profiles table to support phoenix tier (if needed)
-- This is handled by the enum update above

-- 5. Create helper function to get tier limits
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT, p_feature TEXT)
RETURNS TABLE(
    daily_limit INTEGER,
    hourly_limit INTEGER,
    window_hours INTEGER
) AS $$
BEGIN
    IF p_feature = 'message' THEN
        CASE p_tier
            WHEN 'warrior' THEN
                RETURN QUERY SELECT 100, 25, 3;
            WHEN 'premium' THEN
                RETURN QUERY SELECT 300, 50, 3;
            WHEN 'phoenix' THEN
                RETURN QUERY SELECT 1000, 100, 3;
            ELSE
                RETURN QUERY SELECT 10, 10, 3;
        END CASE;
    ELSIF p_feature = 'ex_simulator' THEN
        CASE p_tier
            WHEN 'warrior' THEN
                RETURN QUERY SELECT 30, 5, 3;
            WHEN 'premium' THEN
                RETURN QUERY SELECT 75, 10, 3;
            WHEN 'phoenix' THEN
                RETURN QUERY SELECT 200, 20, 3;
            ELSE
                RETURN QUERY SELECT 0, 0, 3;
        END CASE;
    ELSIF p_feature = 'decoder' THEN
        CASE p_tier
            WHEN 'warrior' THEN
                RETURN QUERY SELECT 15, 5, 3;
            WHEN 'premium' THEN
                RETURN QUERY SELECT 50, 15, 3;
            WHEN 'phoenix' THEN
                RETURN QUERY SELECT 999999, 999999, 3;
            ELSE
                RETURN QUERY SELECT 0, 0, 3;
        END CASE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
