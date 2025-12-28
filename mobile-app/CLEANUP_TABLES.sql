-- =============================================
-- LIMPIEZA DE TABLAS INNECESARIAS
-- Solo borra tablas que NO se usan en el código
-- =============================================

-- IMPORTANTE: Primero verificamos si tienen datos
-- Si alguna tiene datos importantes, NO la borres

-- 1. Ver cuántas filas tiene cada tabla (ejecuta esto primero)
SELECT 'ex_profiles_deep' as tabla, COUNT(*) as filas FROM ex_profiles_deep
UNION ALL SELECT 'ex_simulator_conversations', COUNT(*) FROM ex_simulator_conversations
UNION ALL SELECT 'chat_imports', COUNT(*) FROM chat_imports
UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL SELECT 'coach_conversations', COUNT(*) FROM coach_conversations
UNION ALL SELECT 'coach_messages', COUNT(*) FROM coach_messages
UNION ALL SELECT 'decoded_messages', COUNT(*) FROM decoded_messages
UNION ALL SELECT 'mood_journal', COUNT(*) FROM mood_journal
UNION ALL SELECT 'panic_button_logs', COUNT(*) FROM panic_button_logs
UNION ALL SELECT 'saved_analyses', COUNT(*) FROM saved_analyses;

-- =============================================
-- SI TODAS ESTÁN VACÍAS (0 filas), ejecuta esto:
-- =============================================

-- Descomentapar línea por línea y ejecutar:

-- DROP TABLE IF EXISTS ex_profiles_deep CASCADE;
-- DROP TABLE IF EXISTS ex_simulator_conversations CASCADE;
-- DROP TABLE IF EXISTS chat_imports CASCADE;
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS coach_conversations CASCADE;
-- DROP TABLE IF EXISTS coach_messages CASCADE;
-- DROP TABLE IF EXISTS decoded_messages CASCADE;
-- DROP TABLE IF EXISTS mood_journal CASCADE;
-- DROP TABLE IF EXISTS panic_button_logs CASCADE;
-- DROP TABLE IF EXISTS saved_analyses CASCADE;

-- =============================================
-- VERIFICAR que todo sigue funcionando:
-- =============================================

SELECT 
    'profiles' as tabla, 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
         THEN '✅ OK' ELSE '❌' END as status
UNION ALL SELECT 'ex_profiles', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_profiles') 
         THEN '✅ OK' ELSE '❌' END
UNION ALL SELECT 'ex_memory_facts', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ex_memory_facts') 
         THEN '✅ OK' ELSE '❌' END
UNION ALL SELECT 'message_embeddings', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_embeddings') 
         THEN '✅ OK' ELSE '❌' END
UNION ALL SELECT 'conversation_summaries', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_summaries') 
         THEN '✅ OK' ELSE '❌' END
UNION ALL SELECT 'simulation_conversations', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simulation_conversations') 
         THEN '✅ OK' ELSE '❌' END;
