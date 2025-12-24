-- Drop old usage_limits table if exists (it has wrong structure)
DROP TABLE IF EXISTS public.usage_limits CASCADE;

-- Create NEW usage_limits table for tier-based limits
CREATE TABLE public.usage_limits (
    tier TEXT PRIMARY KEY,
    daily_limit INTEGER NOT NULL,
    hourly_limit INTEGER NOT NULL,
    hourly_window_hours INTEGER NOT NULL DEFAULT 3
);

-- Insert limits by tier (Phoenix adjusted to 700)
INSERT INTO public.usage_limits (tier, daily_limit, hourly_limit, hourly_window_hours)
VALUES 
    ('survivor', 10, 5, 3),
    ('warrior', 100, 30, 3),
    ('premium', 300, 100, 3),
    ('phoenix', 700, 200, 3);

-- Enable RLS
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for reading limits
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can read usage limits" ON public.usage_limits;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Anyone can read usage limits"
    ON public.usage_limits
    FOR SELECT
    USING (true);

-- Index for performance
CREATE INDEX idx_usage_limits_tier ON public.usage_limits(tier);

-- Verify data
SELECT * FROM public.usage_limits ORDER BY daily_limit;
