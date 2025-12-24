-- Migration: Add Ex Simulator Conversations Table
-- Created: 2025-01-19
-- Purpose: Store chat conversations for cross-device sync

-- =====================================================
-- Table: ex_simulator_conversations
-- =====================================================
DROP TABLE IF EXISTS public.ex_simulator_conversations CASCADE;

CREATE TABLE public.ex_simulator_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.ex_profiles_deep(id) ON DELETE CASCADE,
    
    -- Message data
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES public.ex_profiles_deep(id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
DROP INDEX IF EXISTS idx_conversations_user;
DROP INDEX IF EXISTS idx_conversations_profile;
DROP INDEX IF EXISTS idx_conversations_timestamp;
DROP INDEX IF EXISTS idx_conversations_user_profile;

CREATE INDEX idx_conversations_user ON public.ex_simulator_conversations(user_id);
CREATE INDEX idx_conversations_profile ON public.ex_simulator_conversations(profile_id);
CREATE INDEX idx_conversations_timestamp ON public.ex_simulator_conversations(message_timestamp DESC);
CREATE INDEX idx_conversations_user_profile ON public.ex_simulator_conversations(user_id, profile_id, message_timestamp DESC);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.ex_simulator_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.ex_simulator_conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert own messages"
ON public.ex_simulator_conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own messages (for seen status)
CREATE POLICY "Users can update own messages"
ON public.ex_simulator_conversations
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.ex_simulator_conversations
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- Helper Function: Get Conversation
-- =====================================================
CREATE OR REPLACE FUNCTION get_conversation(
    p_profile_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    role TEXT,
    content TEXT,
    message_timestamp TIMESTAMPTZ,
    seen BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.role,
        c.content,
        c.message_timestamp,
        c.seen
    FROM public.ex_simulator_conversations c
    WHERE c.user_id = auth.uid()
      AND c.profile_id = p_profile_id
    ORDER BY c.message_timestamp ASC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- Helper Function: Clear Conversation
-- =====================================================
CREATE OR REPLACE FUNCTION clear_conversation(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.ex_simulator_conversations
    WHERE user_id = auth.uid()
      AND profile_id = p_profile_id;
END;
$$;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.ex_simulator_conversations IS 'Stores chat conversations for Ex Simulator with cross-device sync';
COMMENT ON COLUMN public.ex_simulator_conversations.role IS 'Message role: user or assistant';
COMMENT ON COLUMN public.ex_simulator_conversations.content IS 'Message text content';
COMMENT ON COLUMN public.ex_simulator_conversations.seen IS 'Whether the message has been seen (for read receipts)';
