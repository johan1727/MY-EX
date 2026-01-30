-- Function to safely increment call_credits
-- Security: DEFINER to allow execution with privileges, but restricted to authenticated users matching the ID

create or replace function increment_credits(amount double precision)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set call_credits = coalesce(call_credits, 0) + amount
  where id = auth.uid();
end;
$$;
