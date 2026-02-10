-- Sequence audio storage bucket for persisting blob URLs when saving sequences to cloud.
-- Blob URLs (from URL.createObjectURL) are session-specific and don't work for other users.
-- Run in Supabase Dashboard → SQL Editor after 003_creator_email.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sequence-audio',
  'sequence-audio',
  true,
  52428800,
  null
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to sequence-audio bucket
create policy "Authenticated can upload sequence audio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'sequence-audio');

-- Allow anyone to read (for public sequences)
create policy "Public can read sequence audio"
on storage.objects for select
using (bucket_id = 'sequence-audio');
