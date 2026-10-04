create extension if not exists pgcrypto;

create type public.task_status as enum ('draft','live','paused','expired');
create type public.conversion_status as enum ('pending','approved','reversed','rejected');
create type public.ledger_status as enum ('pending','available','paid','reversed','void');
create type public.asset_type as enum ('NGN_CASH','CONTENT_CREDIT','BONUS_POINT');
create type public.withdrawal_status as enum ('requested','reviewing','approved','processing','paid','failed','cancelled');

-- Application profile. Authentication is owned by Neon Auth.
create table public.profiles (
  id text primary key,
  display_name text,
  country_code text not null default 'NG',
  is_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offer_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'inactive',
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.offer_providers(id),
  external_id text not null,
  title text not null,
  description text,
  category text,
  status public.task_status not null default 'draft',
  country_codes text[] not null default array['NG'],
  advertiser_value numeric(20,2) not null default 0,
  user_reward numeric(20,2) not null default 0,
  reward_asset public.asset_type not null default 'NGN_CASH',
  terms jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  expires_at timestamptz,
  synced_at timestamptz not null default now(),
  unique(provider_id, external_id)
);

create table public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  offer_id uuid not null references public.offers(id),
  offer_title text not null,
  reward_amount numeric(20,2) not null,
  reward_asset public.asset_type not null,
  terms_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  user_task_id uuid references public.user_tasks(id),
  provider_id uuid not null references public.offer_providers(id),
  external_conversion_id text not null,
  status public.conversion_status not null default 'pending',
  advertiser_value numeric(20,2) not null default 0,
  user_reward numeric(20,2) not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  approved_at timestamptz,
  unique(provider_id, external_conversion_id)
);

create table public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  conversion_id uuid references public.conversions(id),
  asset public.asset_type not null,
  amount numeric(20,2) not null,
  status public.ledger_status not null,
  reference_type text not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  amount numeric(20,2) not null check (amount > 0),
  currency text not null default 'NGN',
  bank_name text,
  account_name text,
  account_number_last4 text,
  provider_reference text,
  status public.withdrawal_status not null default 'requested',
  failure_reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete set null,
  event_type text not null,
  severity integer not null default 1 check (severity between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.content_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  content_key text not null,
  unlock_method text not null,
  reference_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, content_key)
);

create index offers_status_idx on public.offers(status, expires_at);
create index offers_country_idx on public.offers using gin(country_codes);
create index user_tasks_user_idx on public.user_tasks(user_id, created_at desc);
create index conversions_user_idx on public.conversions(user_task_id, status);
create index ledger_user_idx on public.reward_ledger(user_id, created_at desc);
create index withdrawals_user_idx on public.withdrawals(user_id, requested_at desc);
create index risk_user_idx on public.risk_events(user_id, created_at desc);
