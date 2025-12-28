-- =============================================
-- PASO 1: Ver cuántas filas tienen las tablas innecesarias
-- EJECUTA ESTO PRIMERO
-- =============================================

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
