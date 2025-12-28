-- ⚠️ ADVERTENCIA: Este script ELIMINA tablas que no se usan
-- EJECUTA SOLO DESPUÉS de verificar con AUDIT_DATABASE.sql

-- ============================================
-- TABLAS DUPLICADAS DEL SIMULADOR
-- ============================================

-- La app usa 'ex_profiles' (básico)
-- Puedes eliminar 'ex_profiles_deep' si no tiene datos o no lo usas
-- DROP TABLE IF EXISTS public.ex_profiles_deep CASCADE;

-- La app usa 'simulation_conversations' 
-- Puedes eliminar 'ex_simulator_conversations' si está vacía
-- DROP TABLE IF EXISTS public.ex_simulator_conversations CASCADE;

-- ============================================
-- TABLAS ANTIGUAS DE MENSAJES
-- ============================================

-- La app usa 'chat_messages' y 'conversations'
-- Puedes eliminar 'messages' si es antigua
-- DROP TABLE IF EXISTS public.messages CASCADE;

-- ============================================
-- TABLAS QUE PROBABLEMENTE NO USAS
-- ============================================

-- Descomenta SOLO las que confirmes que no usas:

-- DROP TABLE IF EXISTS public.decoded_messages CASCADE;
-- DROP TABLE IF EXISTS public.saved_analyses CASCADE;
-- DROP TABLE IF EXISTS public.simulation_sessions CASCADE;
-- DROP TABLE IF EXISTS public.message_embeddings CASCADE;
-- DROP TABLE IF EXISTS public.chat_imports CASCADE;

-- ============================================
-- LIMPIAR DATOS DE PRUEBA (NO ELIMINA TABLAS)
-- ============================================

-- Si quieres mantener las tablas pero limpiar los datos de prueba:
-- DELETE FROM public.simulation_conversations WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM public.ex_profiles WHERE created_at < NOW() - INTERVAL '30 days' AND message_count = 0;
