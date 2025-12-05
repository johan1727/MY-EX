-- Fix Missing Tables and Functions
-- Creates user_stats table and update_streak function

-- 1. Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_messages INTEGER DEFAULT 0,
    total_conversations INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Users can view own stats') THEN
        CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Users can update own stats') THEN
        CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Users can insert own stats') THEN
        CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 2. Create update_streak function
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS TABLE(
    current_streak INTEGER,
    longest_streak INTEGER,
    last_activity DATE
) AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_days_diff INTEGER;
BEGIN
    -- Get current stats
    SELECT last_activity_date, user_stats.current_streak, user_stats.longest_streak
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM user_stats
    WHERE user_id = p_user_id;

    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (p_user_id, 1, 1, CURRENT_DATE);
        
        RETURN QUERY SELECT 1, 1, CURRENT_DATE;
        RETURN;
    END IF;

    -- Calculate days difference
    v_days_diff := CURRENT_DATE - v_last_activity;

    -- Update streak based on activity
    IF v_days_diff = 0 THEN
        -- Same day, no change
        RETURN QUERY SELECT v_current_streak, v_longest_streak, v_last_activity;
        RETURN;
    ELSIF v_days_diff = 1 THEN
        -- Consecutive day, increment streak
        v_current_streak := v_current_streak + 1;
        IF v_current_streak > v_longest_streak THEN
            v_longest_streak := v_current_streak;
        END IF;
    ELSE
        -- Streak broken, reset to 1
        v_current_streak := 1;
    END IF;

    -- Update the record
    UPDATE user_stats
    SET 
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_current_streak, v_longest_streak, CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_streak TO authenticated;

-- 4. Comment for documentation
COMMENT ON TABLE user_stats IS 'Stores user statistics including message counts and streaks';
COMMENT ON FUNCTION update_streak IS 'Updates user streak based on daily activity';
