-- Add voice_id to profiles for storing ElevenLabs voice ID
alter table public.profiles 
add column if not exists voice_id text;

-- Add index for performance if needed (optional but good practice)
create index if not exists idx_profiles_voice_id on public.profiles(voice_id);
