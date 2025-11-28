-- Add streak tracking to profiles
alter table profiles add column if not exists streak_start_date timestamptz default now();
alter table profiles add column if not exists last_contact_date timestamptz;
