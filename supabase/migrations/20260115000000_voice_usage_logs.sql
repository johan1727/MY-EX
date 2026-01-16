-- Create table for tracking voice usage (ElevenLabs)
create table if not exists public.voice_usage_logs (
    id uuid not null default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    profile_id text, -- ID of the Ex Profile being talked to
    minutes_used float not null default 0,
    month_year text not null, -- Format 'MM-YYYY', e.g., '01-2026'
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.voice_usage_logs enable row level security;

-- Policy: Users can view their own usage
create policy "Users can view own voice usage"
on public.voice_usage_logs for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own usage (calls from app)
create policy "Users can insert own voice usage"
on public.voice_usage_logs for insert
with check (auth.uid() = user_id);

-- Index for faster queries on limits
create index idx_voice_usage_user_month on public.voice_usage_logs(user_id, month_year);
