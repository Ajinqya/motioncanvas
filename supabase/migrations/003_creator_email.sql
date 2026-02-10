-- Add creator_email for attribution on public content
alter table public.sequences add column if not exists creator_email text;
alter table public.animations add column if not exists creator_email text;
