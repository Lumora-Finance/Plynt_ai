-- ─────────────────────────────────────────────────────────────────────────────
-- PLYNT — Initial Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ─── ENUM types ───────────────────────────────────────────────────────────────

create type user_role as enum ('user', 'admin');
create type invoice_status as enum ('draft', 'pending', 'paid', 'overdue');
create type asset_symbol as enum ('MON', 'USDC', 'WETH');
create type gift_status as enum ('scheduled', 'available', 'claimed', 'expired', 'cancelled');
create type salary_frequency as enum ('weekly', 'biweekly', 'monthly', 'quarterly');

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- One row per Privy user. privy_did is the stable Privy user DID (user.id).

create table profiles (
  id            uuid primary key default gen_random_uuid(),
  privy_did     text unique not null,          -- e.g. "did:privy:clxxx..."
  wallet_address text,                          -- EVM address (lowercase)
  display_name  text,
  email         text,
  role          user_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at on every row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ─── invoices ─────────────────────────────────────────────────────────────────

create table invoices (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  number        text not null,                 -- e.g. "INV-0001"
  client_name   text not null,
  client_email  text not null,
  title         text not null,
  description   text not null default '',
  amount        numeric(18, 6) not null default 0,
  asset         asset_symbol not null default 'USDC',
  status        invoice_status not null default 'draft',
  due_date      date not null,
  notes         text,
  payment_link  text not null default '',
  items         jsonb not null default '[]',   -- InvoiceItem[]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create index invoices_profile_id_idx on invoices(profile_id);
create index invoices_status_idx on invoices(status);

-- ─── gifts ────────────────────────────────────────────────────────────────────

create table gifts (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references profiles(id) on delete cascade,
  direction             text not null check (direction in ('sent', 'received')),
  recipient             text not null,
  recipient_address     text,
  sender                text not null,
  sender_address        text,
  amount                numeric(18, 6) not null,
  asset                 asset_symbol not null default 'USDC',
  message               text,
  unlock_date           timestamptz not null,
  expiration_date       timestamptz,
  is_recurring          boolean not null default false,
  recurrence_count      integer,
  recurrence_frequency  text,
  executed_count        integer not null default 0,
  status                gift_status not null default 'scheduled',
  claimed_at            timestamptz,
  tx_hash               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger gifts_updated_at
  before update on gifts
  for each row execute function set_updated_at();

create index gifts_profile_id_idx on gifts(profile_id);

-- ─── salary_config ────────────────────────────────────────────────────────────

create table salary_config (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid unique not null references profiles(id) on delete cascade,
  employer          text not null default '',
  amount            numeric(18, 6) not null default 0,
  asset             asset_symbol not null default 'USDC',
  frequency         salary_frequency not null default 'monthly',
  next_payment      date,
  last_payment      date,
  auto_distribute   boolean not null default false,
  distribution_rules jsonb not null default '[]',  -- SalarySplitRule[]
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger salary_config_updated_at
  before update on salary_config
  for each row execute function set_updated_at();

-- ─── salary_records ───────────────────────────────────────────────────────────

create table salary_records (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  employer      text not null,
  amount        numeric(18, 6) not null,
  asset         asset_symbol not null default 'USDC',
  payment_date  date not null,
  period        text not null,              -- e.g. "October 2026"
  status        text not null default 'pending' check (status in ('received', 'pending', 'upcoming')),
  tx_hash       text,
  created_at    timestamptz not null default now()
);

create index salary_records_profile_id_idx on salary_records(profile_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Auth strategy: Privy users authenticate via JWT then call Supabase with
-- the anon key. We use a helper to expose the privy_did from the JWT claim.
-- Until Privy JWT integration is configured, we use a permissive policy that
-- allows the app's service-role or anon key to manage records while the
-- frontend passes privy_did explicitly.
--
-- Policy design: each user can only read/write their own rows.
-- Admins (role = 'admin') can read ALL rows across all tables.

alter table profiles enable row level security;
alter table invoices enable row level security;
alter table gifts enable row level security;
alter table salary_config enable row level security;
alter table salary_records enable row level security;

-- profiles: anyone can insert (self-registration on first login)
create policy "profiles: self insert"
  on profiles for insert
  with check (true);

-- profiles: read own row OR admin reads all
create policy "profiles: self select"
  on profiles for select
  using (true);  -- client filters by privy_did; full lock-down added when JWT wired

-- profiles: update own row only
create policy "profiles: self update"
  on profiles for update
  using (true);

-- invoices: insert own rows
create policy "invoices: self insert"
  on invoices for insert
  with check (true);

create policy "invoices: self select"
  on invoices for select
  using (true);

create policy "invoices: self update"
  on invoices for update
  using (true);

create policy "invoices: self delete"
  on invoices for delete
  using (true);

-- gifts
create policy "gifts: self all"
  on gifts for all
  using (true)
  with check (true);

-- salary_config
create policy "salary_config: self all"
  on salary_config for all
  using (true)
  with check (true);

-- salary_records
create policy "salary_records: self all"
  on salary_records for all
  using (true)
  with check (true);

-- ─── Seed: promote first user to admin ────────────────────────────────────────
-- After the first user signs in, you can run:
--   update profiles set role = 'admin' where privy_did = 'did:privy:YOUR_DID';
-- or use the admin panel once one admin exists.
