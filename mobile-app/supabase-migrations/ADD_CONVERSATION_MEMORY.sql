-- =============================================
-- MIGRACIÓN: Agregar Memoria Episódica a Perfiles
-- Fecha: 2025-12-28
-- Descripción: Agrega columna para guardar hechos clave
--              que el bot debe recordar en conversaciones
-- =============================================

-- 1. Agregar columna de memoria a ex_profiles
ALTER TABLE ex_profiles 
ADD COLUMN IF NOT EXISTS conversation_memory JSONB DEFAULT '{
    "keyFacts": [],
    "emotionalMoments": [],
    "lastUpdated": null
}'::jsonb;

-- 2. Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ex_profiles_memory 
ON ex_profiles USING gin (conversation_memory);

-- 3. Agregar comentario descriptivo
COMMENT ON COLUMN ex_profiles.conversation_memory IS 
'Memoria episódica: hechos clave que el bot debe recordar de conversaciones previas';

-- 4. Verificar que la tabla tiene las políticas RLS
DO $$ 
BEGIN
    -- Habilitar RLS si no está habilitado
    ALTER TABLE ex_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Política: Los usuarios solo ven sus propios perfiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' 
        AND policyname = 'Users can view own profiles'
    ) THEN
        CREATE POLICY "Users can view own profiles"
        ON ex_profiles FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    -- Política: Los usuarios solo insertan sus propios perfiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' 
        AND policyname = 'Users can insert own profiles'
    ) THEN
        CREATE POLICY "Users can insert own profiles"
        ON ex_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    -- Política: Los usuarios solo actualizan sus propios perfiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' 
        AND policyname = 'Users can update own profiles'
    ) THEN
        CREATE POLICY "Users can update own profiles"
        ON ex_profiles FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
    
    -- Política: Los usuarios solo eliminan sus propios perfiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' 
        AND policyname = 'Users can delete own profiles'
    ) THEN
        CREATE POLICY "Users can delete own profiles"
        ON ex_profiles FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Verificar que simulation_conversations también tiene RLS
DO $$ 
BEGIN
    ALTER TABLE simulation_conversations ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'simulation_conversations' 
        AND policyname = 'Users can view own conversations'
    ) THEN
        CREATE POLICY "Users can view own conversations"
        ON simulation_conversations FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'simulation_conversations' 
        AND policyname = 'Users can insert own conversations'
    ) THEN
        CREATE POLICY "Users can insert own conversations"
        ON simulation_conversations FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'simulation_conversations' 
        AND policyname = 'Users can update own conversations'
    ) THEN
        CREATE POLICY "Users can update own conversations"
        ON simulation_conversations FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'simulation_conversations' 
        AND policyname = 'Users can delete own conversations'
    ) THEN
        CREATE POLICY "Users can delete own conversations"
        ON simulation_conversations FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 6. Verificar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ex_profiles'
ORDER BY ordinal_position;

-- 7. Verificar políticas activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('ex_profiles', 'simulation_conversations')
ORDER BY tablename, policyname;
