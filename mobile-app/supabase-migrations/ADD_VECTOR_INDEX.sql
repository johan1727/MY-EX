-- OPTIMIZACIÓN DE BÚSQUEDA VECTORIAL (2026-01-29)
-- Agrega índice HNSW para búsquedas semánticas ultrarrápidas.

-- 1. Asegurar que la extensión vector está activa
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear índice HNSW en message_embeddings
--    Esto permite búsquedas 'Nearest Neighbor' sin recorrer toda la tabla.
--    Usamos 'vector_cosine_ops' porque los embeddings de Gemini/OpenAI suelen usar distancia coseno.
CREATE INDEX IF NOT EXISTS idx_message_embeddings_hnsw 
ON public.message_embeddings USING hnsw (embedding vector_cosine_ops);

-- Nota: Si la tabla ya tiene datos, la creación puede tardar unos segundos.
-- HNSW es mucho más rápido que IVFFlat para consultas, aunque consume un poco más de RAM al construirlo.
