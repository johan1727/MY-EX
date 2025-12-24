-- Gamification System Migration
-- Includes: user_stats, user_achievements, and RPC functions

-- 1. User Stats Table
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats
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

-- 2. User Achievements Table (Enhanced)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    achievement_data JSONB DEFAULT '{}'::jsonb,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_type)
);

-- Enable RLS for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can view own achievements') THEN
        CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can insert own achievements') THEN
        CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 3. RPC Function: add_xp
-- Adds XP to a user and handles leveling up
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_xp INTEGER;
    current_level INTEGER;
    new_xp INTEGER;
    new_level INTEGER;
    xp_for_next_level INTEGER;
    leveled_up BOOLEAN := FALSE;
BEGIN
    -- Get current stats or initialize if not exists
    SELECT xp, level INTO current_xp, current_level
    FROM user_stats
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO user_stats (user_id, xp, level)
        VALUES (p_user_id, 0, 1)
        RETURNING xp, level INTO current_xp, current_level;
    END IF;

    new_xp := current_xp + p_amount;
    
    -- Simple leveling formula: Level * 100 XP required for next level
    -- e.g., Lvl 1 -> 2 needs 100 XP total. Lvl 2 -> 3 needs 300 XP total (100 + 200).
    -- Actually, let's use a simpler threshold for now: Level * 100 is the cap for that level.
    -- Wait, standard is usually: XP needed for next level = Level * 100.
    -- Let's stick to a simple cumulative check.
    
    xp_for_next_level := current_level * 100;
    
    IF new_xp >= xp_for_next_level THEN
        new_level := current_level + 1;
        new_xp := new_xp - xp_for_next_level; -- Reset XP for next level progress? Or keep cumulative?
        -- Let's keep it simple: XP is cumulative, but we check against a threshold.
        -- Actually, most games reset the bar or show progress to next level.
        -- Let's do: XP is cumulative total. Level is calculated.
        -- But for this function, let's just increment level if threshold passed.
        -- Let's use the "XP Bar" approach: new_xp is progress towards next level.
        -- So if I have 90/100 and gain 20, I become level 2 with 10/200.
        
        leveled_up := TRUE;
    ELSE
        new_level := current_level;
    END IF;

    -- Update stats
    UPDATE user_stats
    SET xp = new_xp,
        level = new_level,
        last_activity_date = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'new_xp', new_xp,
        'new_level', new_level,
        'leveled_up', leveled_up
    );
END;
$$;

-- 4. RPC Function: update_streak
-- Updates the user's daily streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    last_date TIMESTAMPTZ;
    curr_streak INTEGER;
    long_streak INTEGER;
    now_date DATE := CURRENT_DATE;
    last_activity_date DATE;
BEGIN
    SELECT last_activity_date, current_streak, longest_streak
    INTO last_date, curr_streak, long_streak
    FROM user_stats
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Initialize stats if not exist
        INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (p_user_id, 1, 1, NOW())
        RETURNING current_streak, longest_streak INTO curr_streak, long_streak;
        RETURN jsonb_build_object('current_streak', 1, 'streak_bonus', false);
    END IF;

    last_activity_date := last_date::DATE;

    IF last_activity_date = now_date THEN
        -- Already active today, no change
        RETURN jsonb_build_object('current_streak', curr_streak, 'streak_bonus', false);
    ELSIF last_activity_date = now_date - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        curr_streak := curr_streak + 1;
        IF curr_streak > long_streak THEN
            long_streak := curr_streak;
        END IF;
        
        UPDATE user_stats
        SET current_streak = curr_streak,
            longest_streak = long_streak,
            last_activity_date = NOW()
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('current_streak', curr_streak, 'streak_bonus', true);
    ELSE
        -- Streak broken
        UPDATE user_stats
        SET current_streak = 1,
            last_activity_date = NOW()
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('current_streak', 1, 'streak_bonus', false);
    END IF;
END;
$$;
