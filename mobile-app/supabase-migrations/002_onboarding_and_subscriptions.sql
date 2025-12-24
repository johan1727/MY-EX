-- Actualización de la tabla profiles para onboarding personalizado
-- Ejecutar en Supabase SQL Editor

-- Añadir nuevas columnas a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB,
ADD COLUMN IF NOT EXISTS who_ended VARCHAR(20),
ADD COLUMN IF NOT EXISTS current_mood INTEGER,
ADD COLUMN IF NOT EXISTS relationship_duration VARCHAR(50),
ADD COLUMN IF NOT EXISTS main_struggles TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Añadir columnas para el sistema de suscripciones
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'survivor',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_message_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS weekly_decoder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_decoder_reset_date DATE DEFAULT CURRENT_DATE;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Función para resetear contadores diarios
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET daily_message_count = 0,
        last_message_reset_date = CURRENT_DATE
    WHERE last_message_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Función para resetear contadores semanales
CREATE OR REPLACE FUNCTION reset_weekly_counters()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET weekly_decoder_count = 0,
        last_decoder_reset_date = CURRENT_DATE
    WHERE last_decoder_reset_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Crear tabla para tracking de uso de features (analytics)
CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name VARCHAR(50) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para feature_usage
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature usage"
    ON feature_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature usage"
    ON feature_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Crear tabla para milestones/achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_data JSONB,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_type)
);

-- RLS para user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Comentarios para documentación
COMMENT ON COLUMN profiles.onboarding_data IS 'Datos completos del onboarding personalizado en formato JSON';
COMMENT ON COLUMN profiles.subscription_tier IS 'Tier de suscripción: survivor (free), warrior, phoenix';
COMMENT ON COLUMN profiles.daily_message_count IS 'Contador de mensajes enviados hoy (reset diario)';
COMMENT ON COLUMN profiles.weekly_decoder_count IS 'Contador de análisis de mensajes esta semana (reset semanal)';
