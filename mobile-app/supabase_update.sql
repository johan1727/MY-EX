-- ========================================
-- ACTUALIZACIÓN DE SCHEMA PARA MY EX COACH
-- ========================================

-- 1. Actualizar tabla profiles (ya existe, solo agregamos campos faltantes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IN ('move_on', 'get_back', 'learn')) DEFAULT 'move_on';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ex_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS breakup_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS no_contact_since DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla mood_journal
CREATE TABLE IF NOT EXISTS mood_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10) NOT NULL,
    note TEXT,
    triggers TEXT[],
    UNIQUE(user_id, date)
);

ALTER TABLE mood_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own journal" ON mood_journal FOR ALL USING (auth.uid() = user_id);

-- 3. Crear tabla decoded_messages
CREATE TABLE IF NOT EXISTS decoded_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ex_message TEXT NOT NULL,
    ai_analysis TEXT NOT NULL,
    suggested_response TEXT,
    is_breadcrumbing BOOLEAN,
    genuine_interest_score INTEGER CHECK (genuine_interest_score BETWEEN 1 AND 10)
);

ALTER TABLE decoded_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own decoded msgs" ON decoded_messages FOR ALL USING (auth.uid() = user_id);

-- 4. Crear tabla panic_button_logs
CREATE TABLE IF NOT EXISTS panic_button_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resisted BOOLEAN,
    coping_strategy TEXT,
    notes TEXT
);

ALTER TABLE panic_button_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own panic logs" ON panic_button_logs FOR ALL USING (auth.uid() = user_id);

-- 5. Crear tabla user_memory (para RAG)
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    key_fact TEXT NOT NULL,
    category TEXT,
    importance_score INTEGER DEFAULT 5 CHECK (importance_score BETWEEN 1 AND 10),
    last_referenced_at TIMESTAMPTZ
);

ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memory" ON user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memory" ON user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_mood_journal_user_date ON mood_journal(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_decoded_messages_user ON decoded_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_logs_user ON panic_button_logs(user_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_user ON user_memory(user_id, created_at DESC);
