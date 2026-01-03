-- =====================================================
-- SQL FINAL - LÍMITES DE TOKENS (3 HORAS & DIARIO)
-- Fecha: 2 de Enero 2026
-- Descripción: Actualiza la lógica de conteo de tokens en 'increment_token_usage' y 'get_tier_token_limits'.
-- Base de cálculo: ~300 tokens por mensaje promedio (Input + Output).
-- Survivor: 20 msgs/3h (6k tokens), 60 msgs/día (18k tokens).
-- =====================================================

-- 1. Actualizar función helper (Fuente de la verdad)
CREATE OR REPLACE FUNCTION get_tier_token_limits(p_tier TEXT)
RETURNS TABLE(
    daily_token_limit INTEGER,
    hourly_token_limit INTEGER,
    window_hours INTEGER
) AS $$
BEGIN
    CASE p_tier
        WHEN 'explorer' THEN
            -- Propuesta: ~500 msgs/día, ~160 msgs/3h
            RETURN QUERY SELECT 150000, 50000, 3;
        WHEN 'warrior' THEN
            -- Propuesta: ~1300 msgs/día, ~400 msgs/3h
            RETURN QUERY SELECT 400000, 120000, 3;
        WHEN 'phoenix' THEN
            -- Propuesta: ~6500 msgs/día, ~2000 msgs/3h (Virtualmente ilimitado para humano)
            RETURN QUERY SELECT 2000000, 600000, 3;
        ELSE -- survivor (free)
            -- Solicitado: 60 msgs/día, 20 msgs/3h
            RETURN QUERY SELECT 18000, 6000, 3;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar función principal de incremento (Usando la helper para DRY)
CREATE OR REPLACE FUNCTION increment_token_usage(
    p_user_id UUID,
    p_feature_type TEXT,
    p_tokens_used INTEGER DEFAULT 0
)
RETURNS TABLE(
    allowed BOOLEAN,
    remaining_tokens INTEGER,
    reset_in_minutes INTEGER,
    limit_type TEXT,
    tier TEXT
) AS $$
DECLARE
    v_tier TEXT;
    v_daily_token_limit INTEGER;
    v_hourly_token_limit INTEGER;
    v_window_hours INTEGER;
    v_current_daily_tokens INTEGER;
    v_current_hourly_tokens INTEGER;
    v_oldest_window TIMESTAMPTZ;
    v_minutes_until_reset INTEGER;
BEGIN
    -- Get subscription tier
    SELECT COALESCE(subscription_tier, 'survivor') INTO v_tier
    FROM profiles
    WHERE id = p_user_id;

    -- Get limits from helper function
    SELECT daily_token_limit, hourly_token_limit, window_hours 
    INTO v_daily_token_limit, v_hourly_token_limit, v_window_hours
    FROM get_tier_token_limits(v_tier);

    -- Check hourly limit (3-hour window) - ALL features combined
    SELECT COALESCE(SUM(tokens_used), 0), MIN(window_start) 
    INTO v_current_hourly_tokens, v_oldest_window
    FROM token_usage_tracking
    WHERE user_id = p_user_id
    AND window_start > NOW() - INTERVAL '3 hours'; -- Hardcoded 3h window logic matches DB design

    IF v_current_hourly_tokens + p_tokens_used >= v_hourly_token_limit THEN
        -- Calculate minutes until oldest window expires
        v_minutes_until_reset := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_window + INTERVAL '3 hours' - NOW()))::INTEGER / 60);
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'hourly'::TEXT,
            v_tier;
        RETURN;
    END IF;

    -- Check daily limit - ALL features combined
    SELECT COALESCE(SUM(tokens_used), 0) INTO v_current_daily_tokens
    FROM token_usage_tracking
    WHERE user_id = p_user_id
    AND window_start > CURRENT_DATE;

    IF v_current_daily_tokens + p_tokens_used >= v_daily_token_limit THEN
        -- Calculate minutes until midnight
        v_minutes_until_reset := EXTRACT(EPOCH FROM (CURRENT_DATE + INTERVAL '1 day' - NOW()))::INTEGER / 60;
        
        RETURN QUERY SELECT 
            FALSE, 
            0, 
            v_minutes_until_reset,
            'daily'::TEXT,
            v_tier;
        RETURN;
    END IF;

    -- Increment token usage
    INSERT INTO token_usage_tracking (user_id, feature, tokens_used, window_start)
    VALUES (p_user_id, p_feature_type, p_tokens_used, NOW());

    -- Clean old tracking records (older than 1 day)
    DELETE FROM token_usage_tracking
    WHERE window_start < NOW() - INTERVAL '1 day';

    RETURN QUERY SELECT 
        TRUE, 
        v_daily_token_limit - v_current_daily_tokens - p_tokens_used, 
        0,
        'none'::TEXT,
        v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
