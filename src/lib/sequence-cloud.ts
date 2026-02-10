/**
 * Cloud persistence for sequences via Supabase.
 * Used when user is signed in and Supabase is configured.
 */

import type { Sequence } from '../runtime/sequence';
import { getSequenceDurationMs } from '../runtime/sequence';
import { supabase } from './supabase';
import type { SavedSequenceMeta } from '../runtime/sequence-storage';

/** Validate that parsed data looks like a Sequence */
function validateSequence(data: unknown): data is Sequence {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.fps === 'number' &&
    typeof o.width === 'number' &&
    typeof o.height === 'number' &&
    Array.isArray(o.scenes)
  );
}

export interface CloudSequenceMetaRow {
  id: string;
  workspace_id: string;
  local_id: string;
  name: string;
  scene_count: number;
  duration_ms: number;
  width: number;
  height: number;
  updated_at: string;
  is_public?: boolean;
  creator_email?: string | null;
}

function toMeta(row: CloudSequenceMetaRow): SavedSequenceMeta {
  return {
    id: row.local_id,
    name: row.name,
    updatedAt: new Date(row.updated_at).getTime(),
    sceneCount: row.scene_count,
    durationMs: row.duration_ms,
    width: row.width,
    height: row.height,
    isPublic: row.is_public ?? false,
    creatorEmail: row.creator_email ?? undefined,
  };
}

/** Save a sequence to the cloud */
export async function saveSequenceCloud(
  workspaceId: string,
  seq: Sequence
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const durationMs = getSequenceDurationMs(seq.scenes, seq.audioClips ?? []);

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { error } = await supabase
  .from('sequences')
  .upsert(
    {
      workspace_id: workspaceId,
      local_id: seq.id,
      name: seq.name,
      data: seq,
      scene_count: seq.scenes.length,
      duration_ms: Math.round(durationMs),   // <-- add Math.round()
      width: Math.round(seq.width),           // <-- add Math.round()
      height: Math.round(seq.height),        // <-- add Math.round()
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'workspace_id,local_id' }
  );

  return { error: error ? new Error(error.message) : null };
}

/** Promote sequence to public */
export async function promoteSequenceCloud(
  workspaceId: string,
  localId: string,
  userId: string | null,
  creatorEmail?: string | null
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('sequences')
    .update({
      is_public: true,
      created_by: userId,
      creator_email: creatorEmail ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}

/** Demote sequence to private */
export async function demoteSequenceCloud(
  workspaceId: string,
  localId: string
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('sequences')
    .update({
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}

/** List public sequences (for anonymous and all users) */
export async function listPublicSequencesCloud(): Promise<{
  data: SavedSequenceMeta[];
  error: Error | null;
}> {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('sequences')
    .select('id, workspace_id, local_id, name, scene_count, duration_ms, width, height, updated_at, is_public, creator_email')
    .eq('is_public', true)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };
  return {
    data: (data ?? []).map((r) => toMeta(r as CloudSequenceMetaRow)),
    error: null,
  };
}

/** List sequences in a workspace */
export async function listSequencesCloud(
  workspaceId: string
): Promise<{ data: SavedSequenceMeta[]; error: Error | null }> {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('sequences')
    .select('id, workspace_id, local_id, name, scene_count, duration_ms, width, height, updated_at, is_public')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };
  return {
    data: (data ?? []).map((r) => toMeta(r as CloudSequenceMetaRow)),
    error: null,
  };
}

/** Load a sequence by id from the cloud */
export async function loadSequenceCloud(
  workspaceId: string,
  localId: string
): Promise<{ data: Sequence | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('sequences')
    .select('data')
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId)
    .single();

  if (error || !data) return { data: null, error: error ? new Error(error.message) : null };

  const seq = (data as { data: unknown }).data;
  if (!validateSequence(seq)) return { data: null, error: new Error('Invalid sequence data') };
  return { data: seq as Sequence, error: null };
}

/** Load a public sequence by id (no auth required) */
export async function loadPublicSequenceCloud(
  localId: string
): Promise<{ data: Sequence | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('sequences')
    .select('data')
    .eq('local_id', localId)
    .eq('is_public', true)
    .single();

  if (error || !data) return { data: null, error: error ? new Error(error.message) : null };

  const seq = (data as { data: unknown }).data;
  if (!validateSequence(seq)) return { data: null, error: new Error('Invalid sequence data') };
  return { data: seq as Sequence, error: null };
}

/** Delete a sequence from the cloud */
export async function deleteSequenceCloud(
  workspaceId: string,
  localId: string
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('sequences')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}
