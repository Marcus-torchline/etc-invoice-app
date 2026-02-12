-- Invoices table: one row per invoice, full payload in data (JSONB).
-- Run this in Supabase Dashboard → SQL Editor (or via Supabase CLI).
create table if not exists public.invoices (
  id text primary key,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional: index for listing by updated_at
create index if not exists invoices_updated_at_idx on public.invoices (updated_at desc);

-- Allow service role / anon to read and write (adjust RLS if you need per-user access)
alter table public.invoices enable row level security;

create policy "Allow all for service role"
  on public.invoices for all
  using (true)
  with check (true);

comment on table public.invoices is 'Invoice records; data column holds full CSV-shaped object (load #, customer, amount, pod_link, etc.).';
