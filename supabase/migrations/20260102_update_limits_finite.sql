-- =====================================================
-- SQL ACTUALIZADO - LÍMITES FINITOS (PHOENIX, WARRIOR, EXPLORER)
-- Fecha: 2 de Enero 2026
-- Objetivo: Establecer límites jerárquicos y finitos (ninguno ilimitado).
-- Tiers activos: Survivor (Free), Explorer, Warrior, Phoenix.
-- =====================================================

-- 1. SURVIVOR (Gratuito) - Base
UPDATE subscription_limits SET
    daily_messages = 50,
    messages_per_8h = 20,
    message_decoder_weekly = 3,
    simulator_analyses_monthly = 1,
    simulator_chat_messages = 20,
    daily_tokens = 5000,
    updated_at = NOW()
WHERE tier = 'survivor';

-- 2. EXPLORER (Básico Pago) - x40 vs Free
UPDATE subscription_limits SET
    daily_messages = 2000,         -- Suficiente para uso intenso
    messages_per_8h = 700,
    message_decoder_weekly = 50,
    simulator_analyses_monthly = 50, -- 1 o 2 al día
    simulator_chat_messages = 100, -- Chats de longitud media
    daily_tokens = 100000,         -- ~15 mensajes largos de IA
    updated_at = NOW()
WHERE tier = 'explorer';

-- 3. WARRIOR (Pro) - x2.5 vs Explorer
UPDATE subscription_limits SET
    daily_messages = 5000,         -- Muy difícil de agotar
    messages_per_8h = 1700,
    message_decoder_weekly = 200,
    simulator_analyses_monthly = 200, -- Varios al día
    simulator_chat_messages = 500,  -- Chats largos
    daily_tokens = 300000,          -- Uso rudo de IA
    updated_at = NOW()
WHERE tier = 'warrior';

-- 4. PHOENIX (Elite) - x4 vs Warrior (YA NO ES ILIMITADO)
-- Se establecen límites "virtualmente infinitos" para humanos, pero seguros para la API.
UPDATE subscription_limits SET
    daily_messages = 20000,        -- Imposible para un humano escribir tanto
    messages_per_8h = 7000,
    message_decoder_weekly = 1000,
    simulator_analyses_monthly = 1000, -- ~30 al día
    simulator_chat_messages = 2000,  -- Memoria muy extensa
    daily_tokens = 1200000,          -- 1.2 Millones de tokens diarios (~$0.10 - $0.20 costo real si usa Flash)
    updated_at = NOW()
WHERE tier = 'phoenix';

-- (Opcional) Desactivar o igualar tiers viejos si existen para evitar uso
-- UPDATE subscription_limits SET daily_messages = 0 WHERE tier IN ('starter', 'premium');

-- Verificación
SELECT tier, daily_messages, daily_tokens, simulator_analyses_monthly 
FROM subscription_limits 
ORDER BY daily_messages ASC;
