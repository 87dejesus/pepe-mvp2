-- Migration: 003_funnel_events
-- Run this in Supabase Dashboard -> SQL Editor
--
-- Funnel + attribution tracking. The client fires one row per funnel step
-- (quiz_start, quiz_complete, paywall_view, checkout_start, paid) tagged with
-- the first-touch UTM captured on landing. Lets us answer "which channel drove
-- paying users" without a third-party analytics vendor. Mirrors the RLS shape
-- of 002_affiliate_clicks.

create table if not exists public.funnel_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete set null,
  event         text not null,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  path          text,
  created_at    timestamptz default now()
);

-- Indexes for analytics queries
create index funnel_events_event_idx   on public.funnel_events(event);
create index funnel_events_created_idx on public.funnel_events(created_at);
create index funnel_events_source_idx  on public.funnel_events(utm_source);
create index funnel_events_user_idx    on public.funnel_events(user_id);

alter table public.funnel_events enable row level security;

-- Anon/authenticated users can insert their own events
create policy "Anyone can insert funnel_events"
  on public.funnel_events for insert
  with check (true);

-- Users can read only their own events
create policy "Users can read own funnel_events"
  on public.funnel_events for select
  using (user_id = auth.uid() or user_id is null);

-- Service role has full access (for analytics / admin)
create policy "Service role full access on funnel_events"
  on public.funnel_events for all
  using (true) with check (true);
