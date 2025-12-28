-- =============================================
-- SQL FINAL: Completar database (solo lo que falta)
-- =============================================

-- 1. Agregar conversation_memory a ex_profiles (si no existe)
ALTER TABLE ex_profiles 
ADD COLUMN IF NOT EXISTS conversation_memory JSONB 
DEFAULT '{"keyFacts": [], "lastUpdated": null}'::jsonb;

-- 2. Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ex_profiles_memory 
ON ex_profiles USING gin (conversation_memory);

-- 3. Verificar y crear RLS policies para ex_memory_facts
ALTER TABLE ex_memory_facts ENABLE ROW LEVEL SECURITY;

-- Drop policies si ya existen (para recrear)
DROP POLICY IF EXISTS "Users can view own memory facts" ON ex_memory_facts;
DROP POLICY IF EXISTS "Users can insert own memory facts" ON ex_memory_facts;
DROP POLICY IF EXISTS "Users can update own memory facts" ON ex_memory_facts;
DROP POLICY IF EXISTS "Users can delete own memory facts" ON ex_memory_facts;

-- Crear policies
CREATE POLICY "Users can view own memory facts"
ON ex_memory_facts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory facts"
ON ex_memory_facts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory facts"
ON ex_memory_facts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory facts"
ON ex_memory_facts FOR DELETE
USING (auth.uid() = user_id);

-- 4. RLS para proactive_messages_queue
ALTER TABLE proactive_messages_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own proactive messages" ON proactive_messages_queue;
DROP POLICY IF EXISTS "Users can insert own proactive messages" ON proactive_messages_queue;
DROP POLICY IF EXISTS "Users can update own proactive messages" ON proactive_messages_queue;

CREATE POLICY "Users can view own proactive messages"
ON proactive_messages_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proactive messages"
ON proactive_messages_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proactive messages"
ON proactive_messages_queue FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Verificar todo
SELECT 
    'ex_profiles columns' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'ex_profiles'
AND column_name IN ('conversation_memory', 'last_proactive_message')

UNION ALL

SELECT 
    'ex_memory_facts policies' as info,
    policyname,
    cmd::text
FROM pg_policies 
WHERE tablename = 'ex_memory_facts'

UNION ALL

SELECT 
    'proactive_messages_queue policies' as info,
    policyname,
    cmd::text
FROM pg_policies 
WHERE tablename = 'proactive_messages_queue';
