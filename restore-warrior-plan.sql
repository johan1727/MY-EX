-- Script para restaurar el plan Warrior
-- Ejecuta esto en Supabase → SQL Editor

-- PASO 1: Encuentra tu usuario (reemplaza con tu email)
SELECT id, email, subscription_tier, subscription_status 
FROM profiles 
WHERE email = 'TU_EMAIL@gmail.com';

-- PASO 2: Restaura el plan Warrior (reemplaza con tu email)
UPDATE profiles 
SET 
    subscription_tier = 'warrior',
    subscription_status = 'active',
    subscription_start_date = NOW(),
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE email = 'TU_EMAIL@gmail.com';

-- PASO 3: Verifica que se aplicó correctamente
SELECT id, email, subscription_tier, subscription_status, subscription_end_date 
FROM profiles 
WHERE email = 'TU_EMAIL@gmail.com';

-- Si no existe el perfil, créalo (reemplaza USER_ID con tu ID de Supabase Auth)
-- INSERT INTO profiles (id, email, subscription_tier, subscription_status, subscription_start_date, subscription_end_date)
-- VALUES ('USER_ID', 'TU_EMAIL@gmail.com', 'warrior', 'active', NOW(), NOW() + INTERVAL '1 year');
