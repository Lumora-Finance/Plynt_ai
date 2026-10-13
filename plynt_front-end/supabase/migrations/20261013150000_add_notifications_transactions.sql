-- ─────────────────────────────────────────────────────────────────────────────
-- PLYNT — Add notifications + transactions tables
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── notifications ────────────────────────────────────────────────────────────

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  type        text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_profile_id_idx on notifications(profile_id);
create index if not exists notifications_read_idx on notifications(profile_id, read);

alter table notifications enable row level security;

create policy "notifications: self all"
  on notifications for all
  using (true)
  with check (true);

-- ─── transactions ─────────────────────────────────────────────────────────────

create table if not exists transactions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  tx_hash       text,
  type          text not null check (type in ('incoming', 'outgoing', 'gift', 'invoice', 'swap', 'convert')),
  counterparty  text not null default '',
  from_address  text,
  to_address    text,
  asset         text not null default 'MON',
  amount        numeric(18, 6) not null default 0,
  usd_value     numeric(18, 6) not null default 0,
  platform_fee  numeric(18, 6) not null default 0,
  status        text not null default 'confirmed' check (status in ('pending', 'confirmed', 'failed')),
  memo          text,
  explorer_url  text,
  created_at    timestamptz not null default now()
);

create index if not exists transactions_profile_id_idx on transactions(profile_id);
create index if not exists transactions_created_at_idx on transactions(profile_id, created_at desc);

alter table transactions enable row level security;

create policy "transactions: self all"
  on transactions for all
  using (true)
  with check (true);
