-- =============================================
-- SISTEMA DE MEMORIA AVANZADO - EJECUTAR EN SUPABASE
-- =============================================

-- 1. TABLA: simulation_conversations (historial completo de conversaciones)
CREATE TABLE IF NOT EXISTS simulation_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Messages structure: [{ role: 'user'|'assistant', content: string, timestamp: string }]
    session_summary TEXT, -- Resumen de la sesión generado por AI
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: ex_memory_facts (hechos estructurados que la IA debe recordar)
CREATE TABLE IF NOT EXISTS ex_memory_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    fact_type TEXT NOT NULL, -- 'name', 'date', 'preference', 'event', 'promise', 'emotion'
    fact_content TEXT NOT NULL, -- El hecho en sí
    importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    mentioned_count INTEGER DEFAULT 1, -- Cuántas veces se ha mencionado
    first_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Habilitar RLS
ALTER TABLE simulation_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ex_memory_facts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para simulation_conversations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_conversations' AND policyname = 'Users can view own conversations') THEN
        CREATE POLICY "Users can view own conversations" ON simulation_conversations FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_conversations' AND policyname = 'Users can insert own conversations') THEN
        CREATE POLICY "Users can insert own conversations" ON simulation_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_conversations' AND policyname = 'Users can update own conversations') THEN
        CREATE POLICY "Users can update own conversations" ON simulation_conversations FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simulation_conversations' AND policyname = 'Users can delete own conversations') THEN
        CREATE POLICY "Users can delete own conversations" ON simulation_conversations FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Políticas RLS para ex_memory_facts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_memory_facts' AND policyname = 'Users can view own facts') THEN
        CREATE POLICY "Users can view own facts" ON ex_memory_facts FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_memory_facts' AND policyname = 'Users can insert own facts') THEN
        CREATE POLICY "Users can insert own facts" ON ex_memory_facts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_memory_facts' AND policyname = 'Users can update own facts') THEN
        CREATE POLICY "Users can update own facts" ON ex_memory_facts FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ex_memory_facts' AND policyname = 'Users can delete own facts') THEN
        CREATE POLICY "Users can delete own facts" ON ex_memory_facts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_simulation_conversations_user_profile ON simulation_conversations(user_id, ex_profile_id);
CREATE INDEX IF NOT EXISTS idx_ex_memory_facts_user_profile ON ex_memory_facts(user_id, ex_profile_id);
CREATE INDEX IF NOT EXISTS idx_ex_memory_facts_type ON ex_memory_facts(fact_type);

-- 7. Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_simulation_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.message_count = jsonb_array_length(NEW.messages);
    NEW.last_message_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS simulation_conversations_updated_at ON simulation_conversations;
CREATE TRIGGER simulation_conversations_updated_at
    BEFORE UPDATE ON simulation_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_simulation_conversation_timestamp();
