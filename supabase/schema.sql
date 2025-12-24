-- ========================================
-- MY EX COACH - SUPABASE DATABASE SCHEMA
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Vector extension for embeddings (para memoria a largo plazo)
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================
-- TABLA: users
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Datos de perfil emocional
    goal TEXT CHECK (goal IN ('move_on', 'get_back', 'learn')) DEFAULT 'move_on',
    ex_name TEXT,
    breakup_reason TEXT,
    breakup_date DATE,
    
    -- Contador de contacto cero
    no_contact_since DATE,
    no_contact_days INTEGER DEFAULT 0,
    
    -- Sistema de monedas (para futuras features premium)
    coins INTEGER DEFAULT 50,
    
    -- Suscripción
    subscription_status TEXT CHECK (subscription_status IN ('free', 'premium', 'canceled')) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Metadatos
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    total_messages_sent INTEGER DEFAULT 0
);

-- ========================================
-- TABLA: chat_logs
-- ========================================
CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    message TEXT NOT NULL,
    sender TEXT CHECK (sender IN ('user', 'ai', 'system')) NOT NULL,
    
    -- Metadata para análisis
    message_type TEXT DEFAULT 'text', -- 'text', 'voice', 'decoder_analysis'
    tokens_used INTEGER,
    
    -- Para detectar patrones
    detected_emotion TEXT, -- 'anger', 'sadness', 'hope', 'desperation'
    flagged_for_safety BOOLEAN DEFAULT FALSE
);

-- Índice para búsquedas rápidas de historial
CREATE INDEX idx_chat_logs_user_created ON chat_logs(user_id, created_at DESC);

-- ========================================
-- TABLA: user_memory (RAG - Vector Store)
-- ========================================
CREATE TABLE user_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hecho clave que la IA debe recordar
    key_fact TEXT NOT NULL,
    category TEXT, -- 'relationship_detail', 'trigger', 'progress', 'pattern'
    
    -- Vector embedding para búsqueda semántica
    embedding vector(1536), -- Dimensión de OpenAI text-embedding-3-small
    
    -- Metadatos
    importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
    last_referenced_at TIMESTAMPTZ
);

-- Índice para búsqueda vectorial (HNSW es más rápido que IVFFlat para <1M registros)
CREATE INDEX idx_user_memory_embedding ON user_memory 
USING hnsw (embedding vector_cosine_ops);

-- ========================================
-- TABLA: mood_journal
-- ========================================
CREATE TABLE mood_journal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Escala de humor
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10) NOT NULL,
    
    -- Notas del usuario
    note TEXT,
    
    -- Triggers identificados
    triggers TEXT[], -- ['saw_ex_photo', 'birthday', 'song']
    
    UNIQUE(user_id, date) -- Solo un registro por día
);

-- ========================================
-- TABLA: panic_button_logs
-- ========================================
CREATE TABLE panic_button_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ¿El usuario logró resistirse?
    resisted BOOLEAN,
    
    -- Estrategia que usó
    coping_strategy TEXT, -- 'talked_to_coach', 'wrote_letter', 'canceled'
    
    -- Notas post-crisis
    notes TEXT
);

-- ========================================
-- TABLA: decoded_messages
-- ========================================
CREATE TABLE decoded_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Mensaje original del ex
    ex_message TEXT NOT NULL,
    
    -- Análisis de la IA
    ai_analysis TEXT NOT NULL,
    suggested_response TEXT,
    
    -- Clasificación automática
    is_breadcrumbing BOOLEAN,
    genuine_interest_score INTEGER CHECK (genuine_interest_score BETWEEN 1 AND 10)
);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE panic_button_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoded_messages ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios solo pueden ver/editar sus propios datos
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own chats" ON chat_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON chat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own memory" ON user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own journal" ON mood_journal FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own panic logs" ON panic_button_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own decoded msgs" ON decoded_messages FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- FUNCIONES ÚTILES
-- ========================================

-- Función para actualizar automáticamente no_contact_days
CREATE OR REPLACE FUNCTION update_no_contact_days()
RETURNS TRIGGER AS $$ 
BEGIN 
    UPDATE users 
    SET no_contact_days = EXTRACT(DAY FROM NOW() - no_contact_since) 
    WHERE id = NEW.user_id; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- Trigger para recalcular días cuando se registra un panic button resistido
CREATE TRIGGER recalculate_no_contact 
AFTER INSERT ON panic_button_logs 
FOR EACH ROW 
WHEN (NEW.resisted = TRUE) 
EXECUTE FUNCTION update_no_contact_days();

-- ========================================
-- SEED DATA (Opcional: datos de prueba)
-- ========================================
-- INSERT INTO users (email, goal, ex_name, no_contact_since) 
-- VALUES ('test@example.com', 'move_on', 'Alex', NOW() - INTERVAL '12 days');