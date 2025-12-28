-- =============================================
-- CREAR TABLA message_embeddings (falta esta)
-- =============================================

-- 1. Crear la tabla que falta
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

-- 2. Habilitar RLS
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- 3. Política RLS
DROP POLICY IF EXISTS "Users can manage own embeddings" ON message_embeddings;
CREATE POLICY "Users can manage own embeddings" ON message_embeddings 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Índice para búsqueda
CREATE INDEX IF NOT EXISTS idx_msg_embed_user ON message_embeddings(user_id, ex_profile_id);

-- 5. Verificar
SELECT 
    'message_embeddings' as tabla, 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_embeddings') 
         THEN '✅ CREADA' ELSE '❌ Error' END as status;
