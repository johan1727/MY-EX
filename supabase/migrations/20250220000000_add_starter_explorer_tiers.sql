-- Add Starter and Explorer Subscription Tiers
-- Migration: 20250220000000_add_starter_explorer_tiers.sql

-- 1. Add new tiers to subscription_tier_enum
DO $$ 
BEGIN
    -- Add 'starter' tier
    BEGIN
        ALTER TYPE subscription_tier_enum ADD VALUE IF NOT EXISTS 'starter';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add 'explorer' tier
    BEGIN
        ALTER TYPE subscription_tier_enum ADD VALUE IF NOT EXISTS 'explorer';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 2. Update increment_usage function to include new tier limits
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
        WHEN 'starter' THEN
            v_daily_limit := 50;
            v_hourly_limit := 15;
        WHEN 'explorer' THEN
            v_daily_limit := 100;
            v_hourly_limit := 30;
        WHEN 'warrior' THEN
            v_daily_limit := 150;
            v_hourly_limit := 40;
        WHEN 'premium' THEN
            v_daily_limit := 400;
            v_hourly_limit := 100;
        WHEN 'phoenix' THEN
            v_daily_limit := 1200;
            v_hourly_limit := 300;
        ELSE -- free/survivor
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

-- 3. Update get_tier_limits helper function
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT, p_feature TEXT)
RETURNS TABLE(
    daily_limit INTEGER,
    hourly_limit INTEGER,
    window_hours INTEGER
) AS $$
BEGIN
    IF p_feature = 'message' THEN
        CASE p_tier
            WHEN 'starter' THEN
                RETURN QUERY SELECT 40, 12, 3;
            WHEN 'explorer' THEN
                RETURN QUERY SELECT 80, 25, 3;
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
            WHEN 'starter' THEN
                RETURN QUERY SELECT 5, 2, 3;
            WHEN 'explorer' THEN
                RETURN QUERY SELECT 10, 3, 3;
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
            WHEN 'starter' THEN
                RETURN QUERY SELECT 5, 2, 3;
            WHEN 'explorer' THEN
                RETURN QUERY SELECT 10, 3, 3;
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
