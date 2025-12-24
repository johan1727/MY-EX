-- 1. Ensure conversations table exists (basic structure)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Nueva conversación',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Safely add columns if they don't exist (idempotent)
DO $$
BEGIN
    -- Add last_message_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
        ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add message_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'message_count') THEN
        ALTER TABLE conversations ADD COLUMN message_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Create indexes (IF NOT EXISTS is standard in Postgres 9.5+)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(user_id, updated_at DESC);

-- 4. Add conversation_id to chat_messages safely
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id, created_at);

-- 5. Migrate existing messages (Idempotent: only if conversation_id is NULL)
-- Create default conversations for users who have messages but no conversation_id
INSERT INTO conversations (user_id, title, created_at, last_message_at, message_count)
SELECT 
    user_id,
    'Conversación Principal',
    MIN(created_at),
    MAX(created_at),
    COUNT(*)
FROM chat_messages
WHERE conversation_id IS NULL
GROUP BY user_id
ON CONFLICT DO NOTHING; -- In case ID generation conflicts (unlikely) or logic repeats

-- Assign orphaned messages to the new default conversations
UPDATE chat_messages cm
SET conversation_id = (
    SELECT c.id 
    FROM conversations c 
    WHERE c.user_id = cm.user_id 
    ORDER BY c.created_at ASC
    LIMIT 1
)
WHERE conversation_id IS NULL;

-- 6. Functions and Triggers
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        message_count = (
            SELECT COUNT(*) 
            FROM chat_messages 
            WHERE conversation_id = NEW.conversation_id
        ),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_metadata ON chat_messages;
CREATE TRIGGER trigger_update_conversation_metadata
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

-- 7. RLS Policies (Drop first to avoid "policy already exists" errors if re-running)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
CREATE POLICY "Users can create their own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
CREATE POLICY "Users can update their own conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
CREATE POLICY "Users can delete their own conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- 8. Fix for Message Editing (The original issue)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
CREATE POLICY "Users can update their own messages" ON chat_messages FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;
CREATE POLICY "Users can delete their own messages" ON chat_messages FOR DELETE USING (auth.uid() = user_id);
