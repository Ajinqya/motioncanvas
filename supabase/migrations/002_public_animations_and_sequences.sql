-- Public animations and sequence promotion
-- Run in Supabase Dashboard → SQL Editor after 001_workspaces_and_sequences.sql

-- User-created animations (paste code or AI)
create table if not exists public.animations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  local_id text not null,
  name text not null,
  code text not null,
  config jsonb default '{}',
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, local_id)
);

create index if not exists animations_workspace_id_idx on public.animations(workspace_id);
create index if not exists animations_is_public_idx on public.animations(is_public) where is_public;

-- Add public/attribution to sequences
alter table public.sequences add column if not exists is_public boolean default false;
alter table public.sequences add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists sequences_is_public_idx on public.sequences(is_public) where is_public;

-- RLS for animations
alter table public.animations enable row level security;

create policy "Public animations readable by all" on public.animations
  for select using (is_public = true);

create policy "Members can manage workspace animations" on public.animations
  for all using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Public sequences: anyone can read
create policy "Public sequences readable by all" on public.sequences
  for select using (is_public = true);
