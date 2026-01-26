-- Corrige el estado de suscripciones que ya pasaron su fecha de expiración pero dicen 'active'
UPDATE profiles
SET subscription_status = 'expired',
    subscription_tier = 'survivor'
WHERE subscription_status = 'active'
  AND subscription_expires_at < NOW();

-- Opcional: Para resetear un usuario específico manualmente (reemplazar ID)
-- UPDATE profiles 
-- SET subscription_tier = 'survivor', 
--     subscription_status = 'free',
--     subscription_expires_at = NULL 
-- WHERE id = 'TU_USER_ID_AQUI';
