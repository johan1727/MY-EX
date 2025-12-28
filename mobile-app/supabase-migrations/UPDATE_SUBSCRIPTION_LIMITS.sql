-- =====================================================
-- SQL ACTUALIZADO - LÍMITES DE SUSCRIPCIÓN v2
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Fecha: 27 Diciembre 2024
-- NOTA: -1 significa ILIMITADO (sin límite)
-- =====================================================

-- Actualizar límites para cada plan
-- SURVIVOR (Gratuito): Se mantiene igual
UPDATE subscription_limits SET
    daily_messages = 90,
    messages_per_8h = 30,
    message_decoder_weekly = 3,
    simulator_analyses_monthly = 1,
    simulator_chat_messages = 30,
    daily_tokens = 6000,
    updated_at = NOW()
WHERE tier = 'survivor';

-- STARTER ($2.49/mes): x5 de los valores anteriores
UPDATE subscription_limits SET
    daily_messages = 1350,      -- 270 x 5
    messages_per_8h = 450,      -- 90 x 5
    message_decoder_weekly = 30, -- 6 x 5
    simulator_analyses_monthly = 45, -- 9 x 5
    simulator_chat_messages = -1, -- Ilimitado
    daily_tokens = 75000,       -- 15000 x 5
    updated_at = NOW()
WHERE tier = 'starter';

-- EXPLORER ($4.99/mes): x5 de los valores anteriores
UPDATE subscription_limits SET
    daily_messages = 2250,      -- 450 x 5
    messages_per_8h = 750,      -- 150 x 5
    message_decoder_weekly = 75, -- 15 x 5
    simulator_analyses_monthly = 150, -- 30 x 5
    simulator_chat_messages = -1, -- Ilimitado
    daily_tokens = 120000,      -- 24000 x 5
    updated_at = NOW()
WHERE tier = 'explorer';

-- WARRIOR ($9.99/mes): x5 de los valores anteriores
UPDATE subscription_limits SET
    daily_messages = 4500,      -- 900 x 5
    messages_per_8h = 1500,     -- 300 x 5
    message_decoder_weekly = -1, -- Ilimitado
    simulator_analyses_monthly = -1, -- Ilimitado
    simulator_chat_messages = -1, -- Ilimitado
    daily_tokens = 150000,      -- 30000 x 5
    updated_at = NOW()
WHERE tier = 'warrior';

-- PREMIUM ($14.99/mes): x5 de los valores anteriores
UPDATE subscription_limits SET
    daily_messages = 13500,     -- 2700 x 5
    messages_per_8h = 4500,     -- 900 x 5
    message_decoder_weekly = -1, -- Ilimitado
    simulator_analyses_monthly = -1, -- Ilimitado
    simulator_chat_messages = -1, -- Ilimitado
    daily_tokens = 750000,      -- 150000 x 5
    updated_at = NOW()
WHERE tier = 'premium';

-- PHOENIX ($24.99/mes): Todo ilimitado (se mantiene igual)
UPDATE subscription_limits SET
    daily_messages = -1,        -- Ilimitado
    messages_per_8h = -1,       -- Ilimitado
    message_decoder_weekly = -1, -- Ilimitado
    simulator_analyses_monthly = -1, -- Ilimitado
    simulator_chat_messages = -1, -- Ilimitado
    daily_tokens = -1,          -- Ilimitado
    updated_at = NOW()
WHERE tier = 'phoenix';

-- =====================================================
-- VERIFICAR CAMBIOS
-- =====================================================
SELECT 'Límites actualizados x5!' AS status;
SELECT * FROM subscription_limits ORDER BY 
    CASE tier 
        WHEN 'survivor' THEN 1 
        WHEN 'starter' THEN 2
        WHEN 'explorer' THEN 3
        WHEN 'warrior' THEN 4
        WHEN 'premium' THEN 5
        WHEN 'phoenix' THEN 6
    END;

-- =====================================================
-- ANÁLISIS DE COSTOS VS GANANCIAS (Gemini API)
-- =====================================================
/*
COSTOS ESTIMADOS DE GEMINI API:
- Gemini 1.5 Flash: ~$0.075 por millón de tokens de entrada
- Gemini 1.5 Pro: ~$1.25 por millón de tokens de entrada

Asumiendo uso promedio del 50% del límite diario y Gemini Flash:

| Plan     | Precio/mes | Tokens/día | Costo API/día | Costo API/mes | Margen     |
|----------|------------|------------|---------------|---------------|------------|
| Starter  | $2.49      | 75,000     | $0.0028       | $0.084        | $2.41 (97%)|
| Explorer | $4.99      | 120,000    | $0.0045       | $0.135        | $4.86 (97%)|
| Warrior  | $9.99      | 150,000    | $0.0056       | $0.168        | $9.82 (98%)|
| Premium  | $14.99     | 750,000    | $0.028        | $0.84         | $14.15(94%)|
| Phoenix  | $24.99     | ~1,000,000 | $0.038        | $1.14         | $23.85(95%)|

CONCLUSIÓN:
✅ El margen de ganancia es EXCELENTE (94-98%)
✅ El costo de API es mínimo comparado con el precio
✅ Incluso con x5 límites, los costos siguen siendo muy bajos
⚠️ Phoenix podría consumir más, pero el precio lo compensa

NOTA: Estos cálculos asumen:
- Uso promedio del 50% del límite
- Gemini 1.5 Flash (el modelo más barato)
- Sin contar costos de hosting de Supabase (~$25/mes fijo)
*/
