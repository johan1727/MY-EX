-- =============================================
-- CORRECCIÓN DE FUNCIONES - EJECUTAR ESTE
-- Las tablas YA EXISTEN, solo faltan las funciones correctas
-- =============================================

-- 1. FUNCIÓN: Búsqueda de mensajes similares (RAG)
-- Esta usa la tabla message_embeddings que SÍ tiene ex_profile_id como TEXT
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

-- 2. FUNCIONES DUMMY para compatibilidad (no necesitan ex_memory_facts)
CREATE OR REPLACE FUNCTION apply_memory_decay()
RETURNS void AS $$
BEGIN
    -- La tabla ex_memory_facts usa UUID, no TEXT
    -- Por ahora no hacemos nada
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION refresh_fact_importance(p_fact_id UUID)
RETURNS void AS $$
BEGIN
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
    -- Retorna vacío por ahora
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar que las tablas existen
SELECT 
    'message_embeddings' as tabla, 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_embeddings') 
         THEN '✅ OK' ELSE '❌ Falta' END as status
UNION ALL
SELECT 
    'conversation_summaries', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_summaries') 
         THEN '✅ OK' ELSE '❌ Falta' END
UNION ALL
SELECT 
    'ex_memory_facts', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') 
         THEN '✅ OK' ELSE '❌ Falta' END
UNION ALL
SELECT 
    'vector extension', 
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
         THEN '✅ OK' ELSE '❌ Falta' END;
