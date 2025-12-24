-- Migration: Add Deep Ex Profiles System
-- Fecha: 2025-01-19
-- Descripción: Sistema de perfiles ultra-profundos basado en análisis de tokens

-- 1. Crear tabla para perfiles profundos
CREATE TABLE IF NOT EXISTS ex_profiles_deep (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ex_name TEXT NOT NULL,
  
  -- Profile data (JSONB para flexibilidad total)
  basic_profile JSONB NOT NULL,
  big_five JSONB,
  family JSONB,
  social_circle JSONB,
  routines JSONB,
  emotions_topics JSONB,
  important_dates JSONB,
  relationship_dynamics JSONB,
  voice_patterns JSONB,
  
  -- Metadata del análisis
  message_count INTEGER NOT NULL DEFAULT 0,
  tokens_analyzed INTEGER NOT NULL DEFAULT 0,
  tokens_in_prompt INTEGER NOT NULL DEFAULT 0,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  analysis_cost_usd FLOAT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para evitar duplicados
  CONSTRAINT unique_user_ex UNIQUE(user_id, ex_name)
);

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ex_profiles_deep_user 
  ON ex_profiles_deep(user_id);

CREATE INDEX IF NOT EXISTS idx_ex_profiles_deep_created 
  ON ex_profiles_deep(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ex_profiles_deep_last_used 
  ON ex_profiles_deep(last_used_at DESC);

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ex_profiles_deep_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ex_profiles_deep_updated_at
  BEFORE UPDATE ON ex_profiles_deep
  FOR EACH ROW
  EXECUTE FUNCTION update_ex_profiles_deep_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE ex_profiles_deep ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios perfiles
CREATE POLICY "Users can view own ex profiles"
  ON ex_profiles_deep
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden crear sus propios perfiles
CREATE POLICY "Users can create own ex profiles"
  ON ex_profiles_deep
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus propios perfiles
CREATE POLICY "Users can update own ex profiles"
  ON ex_profiles_deep
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios pueden eliminar sus propios perfiles
CREATE POLICY "Users can delete own ex profiles"
  ON ex_profiles_deep
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Tabla para historial de conversaciones simuladas
CREATE TABLE IF NOT EXISTS ex_simulator_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES ex_profiles_deep(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenido de la conversación
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para conversaciones
CREATE INDEX IF NOT EXISTS idx_conversations_profile 
  ON ex_simulator_conversations(profile_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user 
  ON ex_simulator_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
  ON ex_simulator_conversations(last_message_at DESC);

-- RLS para conversaciones
ALTER TABLE ex_simulator_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ex_simulator_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON ex_simulator_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ex_simulator_conversations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ex_simulator_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Función helper para obtener perfil profundo
CREATE OR REPLACE FUNCTION get_deep_profile(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  ex_name TEXT,
  full_profile JSONB,
  tokens_analyzed INTEGER,
  confidence_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.ex_name,
    jsonb_build_object(
      'basic', ep.basic_profile,
      'bigFive', ep.big_five,
      'family', ep.family,
      'socialCircle', ep.social_circle,
      'routines', ep.routines,
      'emotionsTopics', ep.emotions_topics,
      'importantDates', ep.important_dates,
      'relationshipDynamics', ep.relationship_dynamics,
      'voicePatterns', ep.voice_patterns
    ) as full_profile,
    ep.tokens_analyzed,
    ep.confidence_score
  FROM ex_profiles_deep ep
  WHERE ep.id = p_profile_id
    AND ep.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para actualizar last_used_at
CREATE OR REPLACE FUNCTION touch_profile(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ex_profiles_deep
  SET last_used_at = NOW()
  WHERE id = p_profile_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comments para documentación
COMMENT ON TABLE ex_profiles_deep IS 
  'Perfiles ultra-profundos de ex parejas basados en análisis de hasta 900k tokens';

COMMENT ON COLUMN ex_profiles_deep.tokens_analyzed IS 
  'Cantidad de tokens analizados del chat original (máx 900k)';

COMMENT ON COLUMN ex_profiles_deep.tokens_in_prompt IS 
  'Cantidad de tokens en el prompt maestro generado (100k-900k)';

COMMENT ON COLUMN ex_profiles_deep.confidence_score IS 
  'Score de confianza del análisis (0-1), basado en cantidad y calidad de datos';

COMMENT ON TABLE ex_simulator_conversations IS 
  'Historial de conversaciones simuladas con cada perfil';

-- 9. Grant necesarios (si usas service role)
GRANT ALL ON ex_profiles_deep TO authenticated;
GRANT ALL ON ex_simulator_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_deep_profile TO authenticated;
GRANT EXECUTE ON FUNCTION touch_profile TO authenticated;

-- Fin de la migración
