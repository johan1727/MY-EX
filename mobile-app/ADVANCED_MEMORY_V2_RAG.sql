-- =============================================
-- SISTEMA DE MEMORIA AVANZADO V2 - RAG + EMBEDDINGS
-- VERSIÓN CORREGIDA - SIN DEPENDENCIA DE ex_profiles
-- EJECUTAR EN SUPABASE SQL EDITOR
-- =============================================

-- 1. HABILITAR EXTENSIÓN PGVECTOR
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABLA: message_embeddings (para RAG - búsqueda semántica)
-- Usamos TEXT para ex_profile_id para flexibilidad
CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id TEXT NOT NULL,             -- ID del perfil (puede ser local o supabase)
    content TEXT NOT NULL,                   -- El mensaje original
    role TEXT NOT NULL,                      -- 'user' o 'assistant'
    embedding vector(768),                   -- Vector de Gemini (768 dimensiones)
    metadata JSONB DEFAULT '{}'::jsonb,      -- Datos adicionales
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: conversation_summaries (resúmenes jerárquicos)
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id TEXT NOT NULL,             -- ID del perfil
    summary_type TEXT NOT NULL,              -- 'session', 'daily', 'weekly', 'monthly'
    summary_content TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 0,
    key_topics TEXT[],                       -- Temas principales
    emotional_tone TEXT,                     -- Tono emocional general
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Añadir columnas de decay a ex_memory_facts (SI LA TABLA EXISTE)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') THEN
        -- Añadir columna decay_score si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'ex_memory_facts' AND column_name = 'decay_score') THEN
            ALTER TABLE ex_memory_facts ADD COLUMN decay_score FLOAT DEFAULT 1.0;
        END IF;
        
        -- Añadir columna last_accessed si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'ex_memory_facts' AND column_name = 'last_accessed') THEN
            ALTER TABLE ex_memory_facts ADD COLUMN last_accessed TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- 5. HABILITAR RLS
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS RLS para message_embeddings
DROP POLICY IF EXISTS "Users can manage own embeddings" ON message_embeddings;
CREATE POLICY "Users can manage own embeddings" ON message_embeddings 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. POLÍTICAS RLS para conversation_summaries
DROP POLICY IF EXISTS "Users can manage own summaries" ON conversation_summaries;
CREATE POLICY "Users can manage own summaries" ON conversation_summaries 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_message_embeddings_user_profile 
    ON message_embeddings(user_id, ex_profile_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_type 
    ON conversation_summaries(user_id, ex_profile_id, summary_type);

-- 9. Índice vectorial HNSW (para búsqueda rápida de similitud)
-- Solo crear si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_embeddings_vector') THEN
        CREATE INDEX idx_message_embeddings_vector 
            ON message_embeddings USING hnsw (embedding vector_cosine_ops);
    END IF;
END $$;

-- 10. FUNCIÓN: Búsqueda de mensajes similares (RAG)
CREATE OR REPLACE FUNCTION search_similar_messages(
    p_user_id UUID,
    p_ex_profile_id TEXT,
    p_query_embedding vector(768),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    role TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.id,
        me.content,
        me.role,
        1 - (me.embedding <=> p_query_embedding) as similarity,
        me.created_at
    FROM message_embeddings me
    WHERE me.user_id = p_user_id 
      AND me.ex_profile_id = p_ex_profile_id
      AND me.embedding IS NOT NULL
      AND 1 - (me.embedding <=> p_query_embedding) >= p_threshold
    ORDER BY me.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNCIÓN: Aplicar decay a la memoria
CREATE OR REPLACE FUNCTION apply_memory_decay()
RETURNS void AS $$
BEGIN
    -- Solo ejecutar si la tabla ex_memory_facts existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') THEN
        -- Reducir decay_score basado en tiempo desde último acceso
        UPDATE ex_memory_facts
        SET decay_score = GREATEST(0.1, decay_score * POWER(0.95, 
            EXTRACT(EPOCH FROM (NOW() - COALESCE(last_accessed, created_at))) / 86400.0
        ))
        WHERE decay_score > 0.1;
        
        -- Desactivar hechos con decay_score muy bajo
        UPDATE ex_memory_facts
        SET is_active = FALSE
        WHERE decay_score < 0.2 AND importance < 5;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNCIÓN: Refrescar importancia al acceder a un hecho
CREATE OR REPLACE FUNCTION refresh_fact_importance(p_fact_id UUID)
RETURNS void AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') THEN
        UPDATE ex_memory_facts
        SET 
            decay_score = LEAST(1.0, decay_score + 0.3),
            last_accessed = NOW(),
            mentioned_count = mentioned_count + 1
        WHERE id = p_fact_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. FUNCIÓN: Obtener hechos activos con decay aplicado
CREATE OR REPLACE FUNCTION get_active_facts(
    p_user_id UUID,
    p_ex_profile_id TEXT,
    p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
    id UUID,
    fact_type TEXT,
    fact_content TEXT,
    effective_importance FLOAT
) AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') THEN
        RETURN QUERY
        SELECT 
            f.id,
            f.fact_type,
            f.fact_content,
            (f.importance * COALESCE(f.decay_score, 1.0)) as effective_importance
        FROM ex_memory_facts f
        WHERE f.user_id = p_user_id 
          AND f.ex_profile_id::TEXT = p_ex_profile_id
          AND f.is_active = TRUE
          AND COALESCE(f.decay_score, 1.0) > 0.2
        ORDER BY (f.importance * COALESCE(f.decay_score, 1.0)) DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Verificar que todo se creó correctamente
SELECT 
    'message_embeddings' as table_name, 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_embeddings') 
         THEN '✅ Creada' ELSE '❌ Error' END as status
UNION ALL
SELECT 
    'conversation_summaries', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_summaries') 
         THEN '✅ Creada' ELSE '❌ Error' END
UNION ALL
SELECT 
    'vector extension', 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN '✅ Habilitada' ELSE '❌ Error' END;
