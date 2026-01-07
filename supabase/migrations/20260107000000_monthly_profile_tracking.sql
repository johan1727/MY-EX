-- Add monthly profile creation tracking to profiles table
-- This prevents abuse by tracking server-side (can't be bypassed by reinstalling app)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS monthly_profiles_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_creation_month TEXT DEFAULT to_char(NOW(), 'YYYY-MM');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_creation_month ON public.profiles(profile_creation_month);

-- Function to check and reset monthly profile count
CREATE OR REPLACE FUNCTION reset_monthly_profile_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If it's a new month, reset the count
    IF NEW.profile_creation_month != to_char(NOW(), 'YYYY-MM') THEN
        NEW.monthly_profiles_created := 0;
        NEW.profile_creation_month := to_char(NOW(), 'YYYY-MM');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset count on any profile update
CREATE TRIGGER trigger_reset_monthly_profile_count
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION reset_monthly_profile_count();

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.monthly_profiles_created IS 'Number of ex-simulator profiles created this month (resets monthly)';
COMMENT ON COLUMN public.profiles.profile_creation_month IS 'Current tracking month in YYYY-MM format';
