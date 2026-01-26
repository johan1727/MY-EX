-- 1. Habilitar la extensión pg_cron (si no está habilitada)
-- Nota: Esto requiere permisos de superusuario o se debe activar desde el Dashboard de Supabase (Database -> Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear la función que limpia las suscripciones expiradas
CREATE OR REPLACE FUNCTION public.handle_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET subscription_status = 'expired',
      subscription_tier = 'survivor'
  WHERE subscription_status = 'active'
    AND subscription_expires_at < NOW();
END;
$$;

-- 3. Programar el trabajo para que se ejecute cada hora (Minuto 0)
-- Formato Cron: Minute Hour Day Month Weekday
SELECT cron.schedule(
  'cleanup_expired_subs', -- Nombre del trabajo (job name)
  '0 * * * *',           -- Cada hora
  $$SELECT public.handle_expired_subscriptions()$$
);

-- Para ver los trabajos programados:
-- SELECT * FROM cron.job;

-- Para detener/eliminar el trabajo:
-- SELECT cron.unschedule('cleanup_expired_subs');
