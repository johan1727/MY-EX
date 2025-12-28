-- =============================================
-- EJECUTAR EN SUPABASE SQL EDITOR
-- =============================================

-- 1. HACER TU CUENTA PREMIUM (corregido - usa 'id' no 'user_id')
UPDATE profiles 
SET subscription_tier = 'phoenix', subscription_status = 'active'
WHERE id = 'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b';

-- 2. Verificar que se actualizó
SELECT id, subscription_tier, subscription_status 
FROM profiles 
WHERE id = 'd4aaa6cf-ccb1-41d6-b809-b69a99c5365b';

-- 3. (OPCIONAL) Si no existe el perfil, créalo
INSERT INTO profiles (id, subscription_tier, subscription_status)
VALUES ('d4aaa6cf-ccb1-41d6-b809-b69a99c5365b', 'phoenix', 'active')
ON CONFLICT (id) DO UPDATE 
SET subscription_tier = 'phoenix', subscription_status = 'active';
