-- =============================================
-- VERIFICAR Y CREAR TABLA EX_PROFILES
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Verificar si la tabla existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'ex_profiles'
);

-- 2. Si no existe, crearla:
CREATE TABLE IF NOT EXISTS ex_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_name TEXT NOT NULL,
    profile_data JSONB DEFAULT '{}'::jsonb,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE ex_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS (si no existen)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' AND policyname = 'Users can view own ex profiles'
    ) THEN
        CREATE POLICY "Users can view own ex profiles" 
        ON ex_profiles FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' AND policyname = 'Users can insert own ex profiles'
    ) THEN
        CREATE POLICY "Users can insert own ex profiles" 
        ON ex_profiles FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' AND policyname = 'Users can update own ex profiles'
    ) THEN
        CREATE POLICY "Users can update own ex profiles" 
        ON ex_profiles FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ex_profiles' AND policyname = 'Users can delete own ex profiles'
    ) THEN
        CREATE POLICY "Users can delete own ex profiles" 
        ON ex_profiles FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Crear índice para performance
CREATE INDEX IF NOT EXISTS idx_ex_profiles_user_id ON ex_profiles(user_id);

-- 6. Ver los perfiles actuales de tu usuario
SELECT * FROM ex_profiles 
WHERE user_id = 'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b';

-- 7. Si necesitas insertar manualmente el perfil de Marian:
-- (Solo usa esto si no tienes perfiles y necesitas recrearlo)
-- INSERT INTO ex_profiles (user_id, ex_name, profile_data, message_count)
-- VALUES (
--     'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b',
--     'Marian',
--     '{}'::jsonb,
--     0
-- );
