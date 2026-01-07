-- Update FREE (survivor) plan limits
-- New limits: 30 msgs/day, 10 msgs/3h
-- Based on ~300 tokens per message

CREATE OR REPLACE FUNCTION get_tier_token_limits(p_tier TEXT)
RETURNS TABLE(
    daily_token_limit INTEGER,
    hourly_token_limit INTEGER,
    window_hours INTEGER
) AS $$
BEGIN
    CASE p_tier
        WHEN 'explorer' THEN
            -- 150 msgs/day -> 45,000 tokens
            -- 50 msgs/3h -> 15,000 tokens
            RETURN QUERY SELECT 45000, 15000, 3;
        WHEN 'warrior' THEN
            -- 500 msgs/day -> 150,000 tokens
            -- 150 msgs/3h -> 45,000 tokens
            RETURN QUERY SELECT 150000, 45000, 3;
        WHEN 'phoenix' THEN
            -- 2000 msgs/day -> 600,000 tokens
            -- 400 msgs/3h -> 120,000 tokens
            RETURN QUERY SELECT 600000, 120000, 3;
        ELSE -- survivor (free)
            -- 30 msgs/day -> 9,000 tokens
            -- 10 msgs/3h -> 3,000 tokens
            RETURN QUERY SELECT 9000, 3000, 3;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
