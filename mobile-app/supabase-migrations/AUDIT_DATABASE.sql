-- PASO 1: Ver cuántos registros tiene cada tabla
-- Ejecuta esto primero para ver qué tablas están en uso

SELECT 
    schemaname,
    tablename,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        table_schema as schemaname,
        table_name as tablename,
        query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
) t
ORDER BY row_count DESC NULLS LAST;

-- PASO 2: Ver tablas específicas del simulador de ex
SELECT 'ex_profiles' as tabla, COUNT(*) as registros FROM public.ex_profiles
UNION ALL
SELECT 'ex_profiles_deep', COUNT(*) FROM public.ex_profiles_deep
UNION ALL
SELECT 'simulation_conversations', COUNT(*) FROM public.simulation_conversations
UNION ALL
SELECT 'simulation_sessions', COUNT(*) FROM public.simulation_sessions
UNION ALL
SELECT 'ex_simulator_conversations', COUNT(*) FROM public.ex_simulator_conversations
UNION ALL
SELECT 'ex_memory_facts', COUNT(*) FROM public.ex_memory_facts
UNION ALL
SELECT 'ex_profiles_master_prompt', COUNT(*) FROM public.ex_profiles_master_prompt
ORDER BY registros DESC;
