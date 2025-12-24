-- Migración para Diario Inteligente y Optimizaciones
-- Ejecutar en Supabase SQL Editor

-- Crear tabla para entradas del diario
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
    emotions TEXT[],
    entry_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own journal entries"
    ON journal_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
    ON journal_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
    ON journal_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
    ON journal_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);

-- Añadir columna para tracking de no-contact en profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS no_contact_since DATE;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para journal_entries
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tabla para almacenar resúmenes de conversaciones (optimización de tokens)
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    summary_text TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summarized_until TIMESTAMP WITH TIME ZONE NOT NULL
);

-- RLS para conversation_summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own summaries"
    ON conversation_summaries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries"
    ON conversation_summaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created_at ON conversation_summaries(created_at DESC);

-- Función para obtener estadísticas de ánimo semanal
CREATE OR REPLACE FUNCTION get_weekly_mood_stats(p_user_id UUID)
RETURNS TABLE (
    day_of_week TEXT,
    avg_mood NUMERIC,
    entry_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(created_at, 'Day') as day_of_week,
        ROUND(AVG(mood_score)::numeric, 1) as avg_mood,
        COUNT(*) as entry_count
    FROM journal_entries
    WHERE user_id = p_user_id
        AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY TO_CHAR(created_at, 'Day'), EXTRACT(DOW FROM created_at)
    ORDER BY EXTRACT(DOW FROM created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar mensajes antiguos (opcional, para optimización)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    -- Eliminar mensajes de más de 6 meses (opcional)
    DELETE FROM chat_messages
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Eliminar entradas de diario de más de 1 año (opcional)
    DELETE FROM journal_entries
    WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE journal_entries IS 'Almacena las entradas del diario de ánimo de los usuarios';
COMMENT ON COLUMN journal_entries.mood_score IS 'Puntuación de ánimo de 1 a 10';
COMMENT ON COLUMN journal_entries.emotions IS 'Array de emociones seleccionadas por el usuario';
COMMENT ON TABLE conversation_summaries IS 'Resúmenes de conversaciones para optimizar uso de tokens de GPT';

-- Insertar datos de ejemplo (opcional, solo para testing)
-- NOTA: Comentar o eliminar en producción
/*
INSERT INTO journal_entries (user_id, mood_score, emotions, entry_text)
SELECT 
    auth.uid(),
    (RANDOM() * 9 + 1)::INTEGER,
    ARRAY['sad', 'hopeful'],
    'Ejemplo de entrada de diario'
WHERE auth.uid() IS NOT NULL;
*/
