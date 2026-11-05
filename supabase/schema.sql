-- Subscription Leak Finder — database schema
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  cycle text not null check (cycle in ('monthly', 'months_12', 'months_24', 'months_36', 'months_48')),
  start_date date not null,
  uses integer not null default 0 check (uses >= 0),
  is_trial boolean not null default false,
  trial_end date,
  expiry_date date,
  expiry_alert_14d_sent boolean not null default false,
  expiry_alert_7d_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

-- Each person can only ever see and change their own rows.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

-- Keep updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- Reset both alert flags whenever expiry_date changes, so moving a renewal
-- date forward re-arms the 14-day/7-day reminders.
create or replace function public.reset_expiry_alerts()
returns trigger
language plpgsql
as $$
begin
  if new.expiry_date is distinct from old.expiry_date then
    new.expiry_alert_14d_sent = false;
    new.expiry_alert_7d_sent = false;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_reset_expiry_alerts on public.subscriptions;
create trigger subscriptions_reset_expiry_alerts
  before update on public.subscriptions
  for each row
  execute function public.reset_expiry_alerts();
