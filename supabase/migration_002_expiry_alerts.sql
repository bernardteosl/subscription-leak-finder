-- Migration 002 — expiry date tracking + renewal alert emails
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to run even if some pieces already exist.

alter table public.subscriptions
  add column if not exists expiry_date date,
  add column if not exists expiry_alert_14d_sent boolean not null default false,
  add column if not exists expiry_alert_7d_sent boolean not null default false;

-- Drop every existing check constraint on the cycle column FIRST, whatever
-- it's named, so the old 2-value rule (monthly/yearly) doesn't block the
-- data fix below from writing the new cycle values.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where rel.relname = 'subscriptions'
      and con.contype = 'c'
      and att.attname = 'cycle'
  loop
    execute format('alter table public.subscriptions drop constraint %I', r.conname);
  end loop;
end $$;

-- Now it's safe to normalize any cycle value that isn't one of the five new options.
update public.subscriptions
  set cycle = case when cycle = 'yearly' then 'months_12' else 'monthly' end
  where cycle not in ('monthly', 'months_12', 'months_24', 'months_36', 'months_48');

alter table public.subscriptions
  add constraint subscriptions_cycle_check
  check (cycle in ('monthly', 'months_12', 'months_24', 'months_36', 'months_48'));

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
