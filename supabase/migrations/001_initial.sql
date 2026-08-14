-- LeadPro initial schema

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.scrape_job_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create table if not exists public.scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null,
  location text not null,
  max_results integer not null default 20 check (max_results > 0 and max_results <= 200),
  status public.scrape_job_status not null default 'pending',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  results_count integer not null default 0,
  error_message text,
  cursor_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.scrape_jobs (id) on delete cascade,
  place_id text,
  name text not null,
  address text,
  phone text,
  website text,
  email text,
  rating numeric(3, 2),
  review_count integer,
  latitude double precision,
  longitude double precision,
  maps_url text,
  category text,
  hours jsonb,
  price_level text,
  description text,
  photos jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, name, address)
);

create index if not exists scrape_jobs_user_id_idx on public.scrape_jobs (user_id);
create index if not exists scrape_jobs_status_idx on public.scrape_jobs (status);
create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_job_id_idx on public.leads (job_id);
create index if not exists leads_maps_url_idx on public.leads (maps_url);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists scrape_jobs_updated_at on public.scrape_jobs;
create trigger scrape_jobs_updated_at
before update on public.scrape_jobs
for each row execute function public.handle_updated_at();

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
before update on public.leads
for each row execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.scrape_jobs enable row level security;
alter table public.leads enable row level security;

create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "Users can view own scrape jobs"
on public.scrape_jobs for select
using (auth.uid() = user_id);

create policy "Users can insert own scrape jobs"
on public.scrape_jobs for insert
with check (auth.uid() = user_id);

create policy "Users can update own scrape jobs"
on public.scrape_jobs for update
using (auth.uid() = user_id);

create policy "Users can view own leads"
on public.leads for select
using (auth.uid() = user_id);

create policy "Users can delete own leads"
on public.leads for delete
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.scrape_jobs;
alter publication supabase_realtime add table public.leads;