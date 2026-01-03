-- Migration: Add emotional state columns to simulation_sessions
-- This adds the columns needed by simulationState.ts for emotional simulation sync

-- Add new columns for emotional state tracking
ALTER TABLE simulation_sessions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS current_emotion JSONB DEFAULT '{"primary": "neutral", "intensity": 0.3}'::jsonb,
ADD COLUMN IF NOT EXISTS emotion_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fatigue JSONB DEFAULT '{"level": 0, "messageCount": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS memory JSONB DEFAULT '{"keyMoments": [], "tensionLevel": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS response_config JSONB DEFAULT '{"minDelayMs": 2000, "maxDelayMs": 6000, "interestLevel": 0.7}'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster lookups by profile
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_last_message 
ON simulation_sessions(ex_profile_id, last_message_at DESC);

-- Create user_corrections table for storing user feedback on AI responses
CREATE TABLE IF NOT EXISTS user_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'estilo', 'tono', 'vocabulario', 'personalidad'
    original_response TEXT NOT NULL,
    user_feedback TEXT NOT NULL,
    corrected_behavior TEXT,
    -- AI-generated improvement suggestions
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    -- Structure:
    -- {
    --   "understood_issue": "string",
    --   "improvement_applied": "string", 
    --   "confidence": 0.0-1.0,
    --   "similar_corrections": 0
    -- }
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_corrections
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_corrections
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_corrections' AND policyname = 'Users can view own corrections') THEN
        CREATE POLICY "Users can view own corrections" ON user_corrections FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_corrections' AND policyname = 'Users can insert own corrections') THEN
        CREATE POLICY "Users can insert own corrections" ON user_corrections FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_corrections' AND policyname = 'Users can update own corrections') THEN
        CREATE POLICY "Users can update own corrections" ON user_corrections FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_corrections' AND policyname = 'Users can delete own corrections') THEN
        CREATE POLICY "Users can delete own corrections" ON user_corrections FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Index for faster correction lookups
CREATE INDEX IF NOT EXISTS idx_user_corrections_profile ON user_corrections(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_corrections_category ON user_corrections(profile_id, category);
