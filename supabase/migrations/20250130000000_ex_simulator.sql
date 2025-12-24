-- Ex Simulator Feature Migration
-- Tables for storing ex profiles, chat imports, and simulation sessions

-- 1. Ex Profiles Table
CREATE TABLE IF NOT EXISTS ex_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_name TEXT NOT NULL,
    profile_data JSONB DEFAULT '{}'::jsonb,
    -- Profile data structure:
    -- {
    --   "communicationStyle": "directa" | "pasivo-agresiva" | "evasiva" | "afectuosa",
    --   "commonPhrases": ["frase1", "frase2"],
    --   "emotionalTone": "cálida" | "fría" | "variable",
    --   "responsePatterns": {...},
    --   "topicsOfInterest": [...],
    --   "redFlags": [...],
    --   "attachmentStyle": "seguro" | "ansioso" | "evitativo"
    -- }
    message_count INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 2. Chat Imports Table (stores raw imported data)
CREATE TABLE IF NOT EXISTS chat_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL, -- 'whatsapp', 'telegram', 'screenshot', 'txt'
    raw_data TEXT, -- Original text data
    processed_messages JSONB DEFAULT '[]'::jsonb,
    -- Processed messages structure:
    -- [{
    --   "timestamp": "2024-01-01T12:00:00Z",
    --   "sender": "user" | "ex",
    --   "content": "mensaje",
    --   "hasMedia": false
    -- }]
    embeddings VECTOR(1536)[], -- For RAG (optional, if using pgvector)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Simulation Sessions Table
CREATE TABLE IF NOT EXISTS simulation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    scenario TEXT, -- 'free_talk', 'she_reaches_out', 'wants_back', etc.
    messages JSONB DEFAULT '[]'::jsonb,
    -- Messages structure:
    -- [{
    --   "role": "user" | "ex",
    --   "content": "mensaje",
    --   "timestamp": "2024-01-01T12:00:00Z",
    --   "confidence": 0.85
    -- }]
    analysis JSONB, -- Post-conversation feedback
    -- Analysis structure:
    -- {
    --   "strengths": ["punto1", "punto2"],
    --   "improvements": ["punto1", "punto2"],
    --   "suggestions": ["sugerencia1"],
    --   "patterns_detected": ["patrón1"]
    -- }
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ex_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ex_profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles' AND policyname = 'Users can view own ex profiles') THEN
        CREATE POLICY "Users can view own ex profiles" ON ex_profiles FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles' AND policyname = 'Users can insert own ex profiles') THEN
        CREATE POLICY "Users can insert own ex profiles" ON ex_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles' AND policyname = 'Users can update own ex profiles') THEN
        CREATE POLICY "Users can update own ex profiles" ON ex_profiles FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_profiles' AND policyname = 'Users can delete own ex profiles') THEN
        CREATE POLICY "Users can delete own ex profiles" ON ex_profiles FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS Policies for chat_imports
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_imports' AND policyname = 'Users can view own chat imports') THEN
        CREATE POLICY "Users can view own chat imports" ON chat_imports FOR SELECT 
        USING (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = chat_imports.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_imports' AND policyname = 'Users can insert own chat imports') THEN
        CREATE POLICY "Users can insert own chat imports" ON chat_imports FOR INSERT 
        WITH CHECK (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = chat_imports.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_imports' AND policyname = 'Users can delete own chat imports') THEN
        CREATE POLICY "Users can delete own chat imports" ON chat_imports FOR DELETE 
        USING (EXISTS (
            SELECT 1 FROM ex_profiles 
            WHERE ex_profiles.id = chat_imports.ex_profile_id 
            AND ex_profiles.user_id = auth.uid()
        ));
    END IF;
END $$;

-- RLS Policies for simulation_sessions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_sessions' AND policyname = 'Users can view own simulation sessions') THEN
        CREATE POLICY "Users can view own simulation sessions" ON simulation_sessions FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_sessions' AND policyname = 'Users can insert own simulation sessions') THEN
        CREATE POLICY "Users can insert own simulation sessions" ON simulation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_sessions' AND policyname = 'Users can update own simulation sessions') THEN
        CREATE POLICY "Users can update own simulation sessions" ON simulation_sessions FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_sessions' AND policyname = 'Users can delete own simulation sessions') THEN
        CREATE POLICY "Users can delete own simulation sessions" ON simulation_sessions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ex_profiles_user_id ON ex_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_imports_profile_id ON chat_imports(ex_profile_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_user_id ON simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_profile_id ON simulation_sessions(ex_profile_id);

-- Function to update ex_profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_ex_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ex_profiles
DROP TRIGGER IF EXISTS ex_profiles_updated_at ON ex_profiles;
CREATE TRIGGER ex_profiles_updated_at
    BEFORE UPDATE ON ex_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_ex_profile_timestamp();
