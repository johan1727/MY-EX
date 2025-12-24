-- Master Prompt System Migration
-- Stores the complete 50k-200k token prompt that defines the ex's complete personality

CREATE TABLE IF NOT EXISTS ex_profiles_master_prompt (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    
    -- Prompt Maestro (50k-200k+ tokens, sin límite)
    master_prompt TEXT NOT NULL,
    
    -- Metadata
    token_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    analysis_duration_seconds INTEGER,
    
    -- Para aprendizaje continuo (como ChatGPT memory)
    learned_facts JSONB DEFAULT '[]'::jsonb,
    -- Estructura: [{"fact": "Le gusta el café por las mañanas", "learned_at": "2024-01-15", "from_conversation_id": "uuid", "confidence": 0.95}]
    
    -- Categorías del análisis (para referencia rápida)
    categories_analyzed JSONB DEFAULT '{}'::jsonb,
    -- Estructura: {"personal_info": true, "family": true, "psychology": true, ...}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ex_profiles_master_prompt ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    -- Users can view their own master prompts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles_master_prompt' AND policyname = 'Users can view own master prompts') THEN
        CREATE POLICY "Users can view own master prompts" ON ex_profiles_master_prompt FOR SELECT 
        USING (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = ex_profiles_master_prompt.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;

    -- Users can insert their own master prompts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles_master_prompt' AND policyname = 'Users can insert own master prompts') THEN
        CREATE POLICY "Users can insert own master prompts" ON ex_profiles_master_prompt FOR INSERT 
        WITH CHECK (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = ex_profiles_master_prompt.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;

    -- Users can update their own master prompts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles_master_prompt' AND policyname = 'Users can update own master prompts') THEN
        CREATE POLICY "Users can update own master prompts" ON ex_profiles_master_prompt FOR UPDATE 
        USING (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = ex_profiles_master_prompt.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;

    -- Users can delete their own master prompts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles_master_prompt' AND policyname = 'Users can delete own master prompts') THEN
        CREATE POLICY "Users can delete own master prompts" ON ex_profiles_master_prompt FOR DELETE 
        USING (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = ex_profiles_master_prompt.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_prompt_profile_id ON ex_profiles_master_prompt(ex_profile_id);

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION update_master_prompt_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS master_prompt_updated_at ON ex_profiles_master_prompt;
CREATE TRIGGER master_prompt_updated_at
    BEFORE UPDATE ON ex_profiles_master_prompt
    FOR EACH ROW
    EXECUTE FUNCTION update_master_prompt_timestamp();

-- IMPORTANTE: También modificamos simulation_sessions para incluir learned_facts
ALTER TABLE simulation_sessions 
ADD COLUMN IF NOT EXISTS learned_facts JSONB DEFAULT '[]'::jsonb;

COMMENT ON TABLE ex_profiles_master_prompt IS 'Stores the complete master prompt (50k-200k tokens) that defines the ex complete personality, generated from deep analysis of chat history';
COMMENT ON COLUMN ex_profiles_master_prompt.master_prompt IS 'The complete prompt text with all personality details, no size limit';
COMMENT ON COLUMN ex_profiles_master_prompt.learned_facts IS 'Facts learned from ongoing conversations, updated after each chat (continuous learning like ChatGPT)';
