
-- Create ex_chat_history table if it doesn't exist
create table if not exists public.ex_chat_history (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.ex_profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.ex_chat_history enable row level security;

create policy "Users can view their own chat history"
on public.ex_chat_history for select
using (
  auth.uid() in (
    select user_id from public.ex_profiles where id = ex_chat_history.profile_id
  )
);

create policy "Users can insert into their own chat history"
on public.ex_chat_history for insert
with check (
  auth.uid() in (
    select user_id from public.ex_profiles where id = ex_chat_history.profile_id
  )
);
