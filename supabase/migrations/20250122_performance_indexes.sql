-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Run this migration to speed up queries
-- ============================================

-- 1. User lookup indexes (CRITICAL for multi-tenant apps)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
  ON profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_ex_profiles_user_id 
  ON ex_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_ex_profiles_last_used 
  ON ex_profiles(user_id, last_used_at DESC);

-- 2. Chat history indexes (for fast message retrieval)
CREATE INDEX IF NOT EXISTS idx_ex_chat_history_profile_created 
  ON ex_chat_history(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_conversations_user_profile 
  ON simulation_conversations(user_id, ex_profile_id);

-- 3. Conversations index
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
  ON conversations(user_id, updated_at DESC);

-- 4. Voice usage (for billing/limits)
CREATE INDEX IF NOT EXISTS idx_voice_usage_user_month 
  ON voice_usage_logs(user_id, month_year);

-- 5. Message embeddings (for RAG/vector search)
CREATE INDEX IF NOT EXISTS idx_embeddings_user_profile 
  ON message_embeddings(user_id, ex_profile_id);

-- 6. Emotional memories (for timeline features)
CREATE INDEX IF NOT EXISTS idx_emotional_memories_profile_date 
  ON emotional_memories(profile_id, date_start DESC);

-- 7. Memory facts (for personality)
CREATE INDEX IF NOT EXISTS idx_memory_facts_profile_active 
  ON ex_memory_facts(ex_profile_id, is_active) 
  WHERE is_active = true;

-- 8. Flagged content (for admin review)
CREATE INDEX IF NOT EXISTS idx_flagged_unreviewed 
  ON ai_flagged_content(reviewed, timestamp DESC) 
  WHERE reviewed = false;

-- ============================================
-- ANALYZE TABLES (Update query planner stats)
-- ============================================
ANALYZE profiles;
ANALYZE ex_profiles;
ANALYZE ex_chat_history;
ANALYZE simulation_conversations;
ANALYZE message_embeddings;
