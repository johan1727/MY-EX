-- Enhanced Ex Simulator with Proactive Messages and Coach Chat
-- Adds tables for autonomous messaging and dual-chat system

-- 1. Add fields to ex_profiles for proactive messaging
ALTER TABLE ex_profiles ADD COLUMN IF NOT EXISTS message_frequency TEXT DEFAULT 'normal'; -- 'low', 'normal', 'high' based on analysis
ALTER TABLE ex_profiles ADD COLUMN IF NOT EXISTS last_proactive_message TIMESTAMPTZ;
ALTER TABLE ex_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; -- User can pause the simulation

-- 2. Create table for proactive messages queue
CREATE TABLE IF NOT EXISTS proactive_messages_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ex_profile_id UUID NOT NULL REFERENCES ex_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE proactive_messages_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proactive_messages_queue' AND policyname = 'Users can view own proactive messages') THEN
        CREATE POLICY "Users can view own proactive messages" ON proactive_messages_queue FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proactive_messages_queue' AND policyname = 'System can insert proactive messages') THEN
        CREATE POLICY "System can insert proactive messages" ON proactive_messages_queue FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proactive_messages_queue' AND policyname = 'System can update proactive messages') THEN
        CREATE POLICY "System can update proactive messages" ON proactive_messages_queue FOR UPDATE USING (true);
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_proactive_queue_scheduled ON proactive_messages_queue(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_proactive_queue_user ON proactive_messages_queue(user_id, ex_profile_id);

-- 3. Create table for coach chat (separate from ex chat)
CREATE TABLE IF NOT EXISTS coach_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ex_profile_id UUID REFERENCES ex_profiles(id) ON DELETE SET NULL, -- Optional: which ex is being discussed
    has_access_to_ex_chat BOOLEAN DEFAULT false, -- Permission granted by user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'user' or 'coach'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coach_conversations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_conversations' AND policyname = 'Users can view own coach conversations') THEN
        CREATE POLICY "Users can view own coach conversations" ON coach_conversations FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_conversations' AND policyname = 'Users can insert own coach conversations') THEN
        CREATE POLICY "Users can insert own coach conversations" ON coach_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_conversations' AND policyname = 'Users can update own coach conversations') THEN
        CREATE POLICY "Users can update own coach conversations" ON coach_conversations FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- RLS Policies for coach_messages
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_messages' AND policyname = 'Users can view own coach messages') THEN
        CREATE POLICY "Users can view own coach messages" ON coach_messages FOR SELECT 
        USING (EXISTS (
            SELECT 1 FROM coach_conversations 
            WHERE coach_conversations.id = coach_messages.conversation_id 
            AND coach_conversations.user_id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_messages' AND policyname = 'Users can insert own coach messages') THEN
        CREATE POLICY "Users can insert own coach messages" ON coach_messages FOR INSERT 
        WITH CHECK (EXISTS (
            SELECT 1 FROM coach_conversations 
            WHERE coach_conversations.id = coach_messages.conversation_id 
            AND coach_conversations.user_id = auth.uid()
        ));
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user ON coach_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_conversation ON coach_messages(conversation_id, created_at);

-- 4. Function to generate proactive message
CREATE OR REPLACE FUNCTION generate_proactive_message(
    p_ex_profile_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_profile JSONB;
    v_last_messages JSONB;
    v_message TEXT;
BEGIN
    -- Get profile data
    SELECT profile_data INTO v_profile
    FROM ex_profiles
    WHERE id = p_ex_profile_id;
    
    -- Get last 5 messages from simulation_sessions
    SELECT jsonb_agg(m ORDER BY (m->>'timestamp')::TIMESTAMPTZ DESC)
    INTO v_last_messages
    FROM simulation_sessions ss,
    jsonb_array_elements(ss.messages) m
    WHERE ss.ex_profile_id = p_ex_profile_id
    ORDER BY ss.created_at DESC
    LIMIT 5;
    
    -- Return a contextual message (this will be enhanced with AI later)
    -- For now, return a simple message based on common phrases
    IF v_profile ? 'commonPhrases' AND jsonb_array_length(v_profile->'commonPhrases') > 0 THEN
        v_message := v_profile->'commonPhrases'->>0;
    ELSE
        v_message := 'Hola, cómo estás?';
    END IF;
    
    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to schedule proactive messages
CREATE OR REPLACE FUNCTION schedule_proactive_message(
    p_ex_profile_id UUID,
    p_hours_from_now INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_message TEXT;
    v_message_id UUID;
BEGIN
    -- Get user_id from profile
    SELECT user_id INTO v_user_id
    FROM ex_profiles
    WHERE id = p_ex_profile_id;
    
    -- Generate message
    v_message := generate_proactive_message(p_ex_profile_id);
    
    -- Insert into queue
    INSERT INTO proactive_messages_queue (
        ex_profile_id,
        user_id,
        message_content,
        scheduled_for
    ) VALUES (
        p_ex_profile_id,
        v_user_id,
        v_message,
        NOW() + (p_hours_from_now || ' hours')::INTERVAL
    ) RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
