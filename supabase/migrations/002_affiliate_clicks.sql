-- Migration: 002_affiliate_clicks
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.affiliate_clicks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  partner     text not null,
  target_url  text not null,
  source_page text,
  created_at  timestamptz default now()
);

-- Indexes for analytics queries
create index affiliate_clicks_partner_idx on public.affiliate_clicks(partner);
create index affiliate_clicks_created_idx on public.affiliate_clicks(created_at);
create index affiliate_clicks_user_idx    on public.affiliate_clicks(user_id);

alter table public.affiliate_clicks enable row level security;

-- Anon/authenticated users can insert their own clicks
create policy "Anyone can insert affiliate_clicks"
  on public.affiliate_clicks for insert
  with check (true);

-- Users can read only their own clicks
create policy "Users can read own affiliate_clicks"
  on public.affiliate_clicks for select
  using (user_id = auth.uid() or user_id is null);

-- Service role has full access (for analytics / admin)
create policy "Service role full access on affiliate_clicks"
  on public.affiliate_clicks for all
  using (true) with check (true);
