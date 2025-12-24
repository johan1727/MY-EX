-- Create table for content reports (Google Play requirement)
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('offensive', 'inappropriate', 'harmful', 'false_information', 'other')),
    additional_details TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_reports_user_id ON public.content_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_at ON public.content_reports(reported_at DESC);

-- Enable Row Level Security
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can insert their own reports
CREATE POLICY "Users can create content reports"
ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- RLS Policy: Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all reports (you can customize this later)
-- For now, allow public read for moderation dashboard
CREATE POLICY "Allow read access for moderation"
ON public.content_reports
FOR SELECT
USING (true);

-- Add comment to table
COMMENT ON TABLE public.content_reports IS 'Stores user reports of AI-generated content. Required by Google Play AI policy (effective Jan 31, 2024).';
