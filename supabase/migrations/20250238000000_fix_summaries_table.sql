-- Fix conversation_summaries table to support both RAG and Legacy formats
-- 1. Make legacy columns nullable so RAG service can insert without them
ALTER TABLE conversation_summaries ALTER COLUMN summary_text DROP NOT NULL;
ALTER TABLE conversation_summaries ALTER COLUMN summarized_until DROP NOT NULL;

-- 2. Add new columns for RAG service
ALTER TABLE conversation_summaries 
ADD COLUMN IF NOT EXISTS ex_profile_id UUID REFERENCES ex_profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS summary_type TEXT DEFAULT 'session',
ADD COLUMN IF NOT EXISTS summary_content TEXT,
ADD COLUMN IF NOT EXISTS key_topics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS emotional_tone TEXT DEFAULT 'neutral',
ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ DEFAULT NOW();

-- 3. Create index for RAG lookups
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_profile 
ON conversation_summaries(user_id, ex_profile_id);
