-- Supabase schema for shared workspaces and sequences
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Workspaces (shared project/team)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Members (who can access a workspace)
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Sequences (animation sequences)
create table if not exists public.sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  local_id text not null,
  name text not null,
  data jsonb not null,
  scene_count int not null default 0,
  duration_ms int not null default 0,
  width int not null,
  height int not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id),
  unique(workspace_id, local_id)
);

-- Indexes
create index if not exists sequences_workspace_id_idx on public.sequences(workspace_id);
create index if not exists sequences_workspace_updated_idx on public.sequences(workspace_id, updated_at desc);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);

-- Row Level Security
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.sequences enable row level security;

-- Workspaces: members can read/update workspaces they belong to
create policy "Members can manage workspace" on public.workspaces
  for all using (
    id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Workspace members: members can see other members in their workspaces
create policy "Members can see workspace members" on public.workspace_members
  for all using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Sequences: members can CRUD sequences in their workspaces
create policy "Members can CRUD sequences" on public.sequences
  for all using (
    workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
  );

-- Allow authenticated users to create new workspaces
create policy "Authenticated users can create workspaces" on public.workspaces
  for insert with check (auth.uid() is not null);

-- Allow users to add themselves as members (for initial workspace creation)
create policy "Users can join as owner" on public.workspace_members
  for insert with check (user_id = auth.uid());
