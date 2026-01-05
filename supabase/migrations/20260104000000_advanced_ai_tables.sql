-- Migration: Advanced AI Features - Important Dates and Emotional Memories  
-- Date: 2026-01-04
-- Description: Creates tables for storing important dates and emotional memories
-- CORRECTED VERSION: Uses UUID for profile_id to match ex_profiles schema

-- ============================================================================
-- DROP EXISTING FUNCTION IF EXISTS (to avoid conflicts)
-- ============================================================================
DROP FUNCTION IF EXISTS get_todays_important_dates(TEXT);
DROP FUNCTION IF EXISTS get_todays_important_dates(UUID);

-- ============================================================================
-- IMPORTANT_DATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS important_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    
    -- Date information
    date_type TEXT NOT NULL CHECK (date_type IN ('birthday', 'anniversary', 'first_date', 'breakup', 'other')),
    date_value DATE NOT NULL,
    description TEXT NOT NULL,
    
    -- Detection metadata
    confidence_score FLOAT DEFAULT 0,
    detected_from_messages TEXT[], -- Array of message IDs or indices
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for important_dates
CREATE INDEX IF NOT EXISTS idx_important_dates_profile 
    ON important_dates(profile_id);
    
CREATE INDEX IF NOT EXISTS idx_important_dates_user 
    ON important_dates(user_id);
    
CREATE INDEX IF NOT EXISTS idx_important_dates_type_value 
    ON important_dates(date_type, date_value);

-- Enable RLS
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for important_dates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'important_dates' AND policyname = 'Users can view own dates') THEN
        CREATE POLICY "Users can view own dates" 
            ON important_dates FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'important_dates' AND policyname = 'Users can insert own dates') THEN
        CREATE POLICY "Users can insert own dates" 
            ON important_dates FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'important_dates' AND policyname = 'Users can update own dates') THEN
        CREATE POLICY "Users can update own dates" 
            ON important_dates FOR UPDATE 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'important_dates' AND policyname = 'Users can delete own dates') THEN
        CREATE POLICY "Users can delete own dates" 
            ON important_dates FOR DELETE 
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- EMOTIONAL_MEMORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS emotional_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    
    -- Memory classification
    memory_type TEXT NOT NULL CHECK (memory_type IN ('happy', 'conflict', 'milestone', 'painful')),
    
    -- Memory content
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    
    -- Message references
    message_ids TEXT[], -- Array of message IDs or indices from the original chat
    
    -- Emotional scoring
    emotional_score FLOAT NOT NULL DEFAULT 0, -- -1 (very negative) to 1 (very positive)
    
    -- Date range of the memory
    date_start TIMESTAMPTZ NOT NULL,
    date_end TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for emotional_memories
CREATE INDEX IF NOT EXISTS idx_emotional_memories_profile 
    ON emotional_memories(profile_id);
    
CREATE INDEX IF NOT EXISTS idx_emotional_memories_user 
    ON emotional_memories(user_id);
    
CREATE INDEX IF NOT EXISTS idx_emotional_memories_type 
    ON emotional_memories(memory_type);
    
CREATE INDEX IF NOT EXISTS idx_emotional_memories_score 
    ON emotional_memories(emotional_score DESC);
    
CREATE INDEX IF NOT EXISTS idx_emotional_memories_date_range 
    ON emotional_memories(date_start, date_end);

-- Enable RLS
ALTER TABLE emotional_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emotional_memories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emotional_memories' AND policyname = 'Users can view own memories') THEN
        CREATE POLICY "Users can view own memories" 
            ON emotional_memories FOR SELECT 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emotional_memories' AND policyname = 'Users can insert own memories') THEN
        CREATE POLICY "Users can insert own memories" 
            ON emotional_memories FOR INSERT 
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emotional_memories' AND policyname = 'Users can update own memories') THEN
        CREATE POLICY "Users can update own memories" 
            ON emotional_memories FOR UPDATE 
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'emotional_memories' AND policyname = 'Users can delete own memories') THEN
        CREATE POLICY "Users can delete own memories" 
            ON emotional_memories FOR DELETE 
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get today's important dates (FIXED: using UUID)
CREATE OR REPLACE FUNCTION get_todays_important_dates(p_profile_id UUID)
RETURNS TABLE (
    id UUID,
    date_type TEXT,
    date_value DATE,
    description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.date_type,
        d.date_value,
        d.description
    FROM important_dates d
    WHERE d.profile_id = p_profile_id
      AND d.user_id = auth.uid()
      AND EXTRACT(MONTH FROM d.date_value) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM d.date_value) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$;

-- Comments for documentation
COMMENT ON TABLE important_dates IS 'Stores important dates detected from chat analysis (birthdays, anniversaries, breakup dates)';
COMMENT ON TABLE emotional_memories IS 'Stores AI-generated summaries of emotional moments clustered from chat history';
COMMENT ON FUNCTION get_todays_important_dates IS 'Returns important dates matching today (month and day)';
