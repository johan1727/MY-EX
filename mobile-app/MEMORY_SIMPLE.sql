-- =============================================
-- SISTEMA DE MEMORIA SIMPLE - SOLO TABLAS NUEVAS
-- VERSIÓN MÍNIMA - EJECUTAR EN SUPABASE
-- =============================================

-- 1. HABILITAR EXTENSIÓN PGVECTOR
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABLA: message_embeddings (para RAG)
CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ex_profile_id TEXT NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: conversation_summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    ex_profile_id TEXT NOT NULL,
    summary_type TEXT NOT NULL,
    summary_content TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 0,
    key_topics TEXT[],
    emotional_tone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HABILITAR RLS
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS
DROP POLICY IF EXISTS "Users can manage own embeddings" ON message_embeddings;
CREATE POLICY "Users can manage own embeddings" ON message_embeddings 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own summaries" ON conversation_summaries;
CREATE POLICY "Users can manage own summaries" ON conversation_summaries 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_msg_embed_user ON message_embeddings(user_id, ex_profile_id);
CREATE INDEX IF NOT EXISTS idx_conv_sum_user ON conversation_summaries(user_id, ex_profile_id);

-- 7. FUNCIÓN: Búsqueda de mensajes similares
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

-- 8. FUNCIONES VACÍAS para compatibilidad (no hacen nada si ex_memory_facts no existe)
CREATE OR REPLACE FUNCTION apply_memory_decay()
RETURNS void AS $$
BEGIN
    -- No-op si la tabla no existe
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_fact_importance(p_fact_id UUID)
RETURNS void AS $$
BEGIN
    -- No-op
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    -- Retorna vacío si no hay tabla
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. VERIFICAR
SELECT 'message_embeddings' as tabla, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_embeddings') 
            THEN '✅ OK' ELSE '❌ Error' END as status
UNION ALL
SELECT 'conversation_summaries', 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_summaries') 
            THEN '✅ OK' ELSE '❌ Error' END
UNION ALL
SELECT 'vector extension', 
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
            THEN '✅ OK' ELSE '❌ Error' END;
