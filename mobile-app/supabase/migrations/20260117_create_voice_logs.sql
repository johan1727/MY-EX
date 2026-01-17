-- Create table for tracking voice usage
create table if not exists public.voice_usage_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users not null,
    profile_id uuid, -- Optional link to specific ex-profile
    minutes_used numeric not null,
    month_year text not null -- Format "MM-YYYY" for easy grouping
);

-- Index for faster lookups
create index if not exists idx_voice_usage_user_month on public.voice_usage_logs(user_id, month_year);

-- RLS Policies
alter table public.voice_usage_logs enable row level security;

create policy "Users can insert their own logs"
on public.voice_usage_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own logs"
on public.voice_usage_logs for select
to authenticated
using (auth.uid() = user_id);
