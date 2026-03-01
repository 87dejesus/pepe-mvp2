-- Migration: 001_users_table
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text not null default 'none'
    check (subscription_status in ('none','trialing','active','canceled','payment_failed')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

-- Service role can write (used by webhook and OTP routes)
create policy "Service role full access"
  on public.users for all
  using (true)
  with check (true);

-- Auto-create public.users row when Supabase Auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
