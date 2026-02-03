-- Supabase Schema for FI Runway
-- Run this in your Supabase SQL Editor (supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- User financial plans table
create table public.financial_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default 'My Plan' not null,
  data jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, name)
);

-- Index for fast lookups
create index financial_plans_user_id_idx on public.financial_plans(user_id);

-- Enable Row Level Security
alter table public.financial_plans enable row level security;

-- Users can only access their own plans
create policy "Users can manage own plans" on public.financial_plans
  for all using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger financial_plans_updated_at
  before update on public.financial_plans
  for each row execute function update_updated_at();
