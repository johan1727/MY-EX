-- Migration: Relationship Entities (Wiki Feature)
-- Creates table to store extracted entities from chat analysis

CREATE TABLE IF NOT EXISTS relationship_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Entity details
    entity_type TEXT NOT NULL CHECK (entity_type IN ('pet', 'place', 'date', 'person', 'event', 'object')),
    name TEXT NOT NULL,
    context TEXT, -- Additional context about this entity
    
    -- Metadata
    first_mentioned_at TIMESTAMP,
    frequency INT DEFAULT 1, -- How many times mentioned
    importance_score FLOAT DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_entities_profile ON relationship_entities(profile_id);
CREATE INDEX idx_entities_user ON relationship_entities(user_id);
CREATE INDEX idx_entities_type ON relationship_entities(entity_type);
CREATE INDEX idx_entities_importance ON relationship_entities(importance_score DESC);

-- RLS Policies
ALTER TABLE relationship_entities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entities
CREATE POLICY "Users can view own entities"
    ON relationship_entities FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own entities
CREATE POLICY "Users can insert own entities"
    ON relationship_entities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own entities
CREATE POLICY "Users can update own entities"
    ON relationship_entities FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own entities
CREATE POLICY "Users can delete own entities"
    ON relationship_entities FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_relationship_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_relationship_entities_timestamp
    BEFORE UPDATE ON relationship_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_relationship_entities_updated_at();
