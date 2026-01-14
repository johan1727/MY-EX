-- AI Content Moderation Table (Google Play Compliance)
-- Required for apps with generative AI content

CREATE TABLE IF NOT EXISTS ai_flagged_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('ex_simulator', 'analysis', 'coach')),
  reason TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_flagged_content_user ON ai_flagged_content(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_flagged_content_timestamp ON ai_flagged_content(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_flagged_content_reviewed ON ai_flagged_content(reviewed) WHERE NOT reviewed;

-- RLS Policies
ALTER TABLE ai_flagged_content ENABLE ROW LEVEL SECURITY;

-- Users can insert their own flags
CREATE POLICY "Users can flag AI content"
  ON ai_flagged_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own flags
CREATE POLICY "Users can view their flags"
  ON ai_flagged_content
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add column to user_preferences for AI disclaimer
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ai_disclaimer_seen BOOLEAN DEFAULT FALSE;
