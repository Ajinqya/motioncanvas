/**
 * Cloud persistence for sequences via Supabase.
 * Used when user is signed in and Supabase is configured.
 *
 * Audio clips use blob URLs (from URL.createObjectURL) which are session-specific.
 * Before saving, we upload blob URLs to Supabase Storage and replace with public URLs
 * so other users can load the sequence and see waveforms.
 */

import type { Sequence, AudioClipEntry } from '../runtime/sequence';
import { getSequenceDurationMs } from '../runtime/sequence';
import { supabase } from './supabase';
import type { SavedSequenceMeta } from '../runtime/sequence-storage';

const SEQUENCE_AUDIO_BUCKET = 'sequence-audio';

/** Upload blob URL to Supabase Storage, return public URL or null on error */
async function uploadBlobToStorage(
  blobUrl: string,
  workspaceId: string,
  seqId: string,
  clipId: string,
  filename: string
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() ?? 'audio' : 'audio';
    const safeExt = /^[a-z0-9]+$/i.test(ext ?? '') ? ext : 'audio';
    const path = `${workspaceId}/${seqId}/${clipId}.${safeExt}`;
    const { error } = await supabase.storage
      .from(SEQUENCE_AUDIO_BUCKET)
      .upload(path, blob, { contentType: blob.type || 'audio/mpeg', upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from(SEQUENCE_AUDIO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/** Replace blob URLs in audio clips with Supabase Storage URLs */
async function ensureAudioUrlsPersisted(
  seq: Sequence,
  workspaceId: string
): Promise<Sequence> {
  const clips = seq.audioClips ?? [];
  if (clips.length === 0) return seq;

  const updatedClips: AudioClipEntry[] = [];
  let changed = false;

  for (const clip of clips) {
    const url = clip.audioUrl;
    if (url.startsWith('blob:')) {
      const storageUrl = await uploadBlobToStorage(
        url,
        workspaceId,
        seq.id,
        clip.clipId,
        clip.audioFilename
      );
      if (storageUrl) {
        updatedClips.push({ ...clip, audioUrl: storageUrl });
        changed = true;
      } else {
        updatedClips.push(clip);
      }
    } else {
      updatedClips.push(clip);
    }
  }

  if (!changed) return seq;
  return { ...seq, audioClips: updatedClips };
}

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
    workspaceId: row.workspace_id,
  };
}

/** Save a sequence to the cloud */
export async function saveSequenceCloud(
  workspaceId: string,
  seq: Sequence
): Promise<{ data: Sequence | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  const seqToSave = await ensureAudioUrlsPersisted(seq, workspaceId);

  const durationMs = getSequenceDurationMs(seqToSave.scenes, seqToSave.audioClips ?? []);

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

  const { error } = await supabase
  .from('sequences')
  .upsert(
    {
      workspace_id: workspaceId,
      local_id: seqToSave.id,
      name: seqToSave.name,
      data: seqToSave,
      scene_count: seqToSave.scenes.length,
      duration_ms: Math.round(durationMs),
      width: Math.round(seqToSave.width),
      height: Math.round(seqToSave.height),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'workspace_id,local_id' }
  );

  return {
    data: error ? null : seqToSave,
    error: error ? new Error(error.message) : null,
  };
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

/** Load a public sequence by id. Pass workspaceId when known to avoid 406 when multiple rows share the same local_id. */
export async function loadPublicSequenceCloud(
  localId: string,
  workspaceId?: string
): Promise<{ data: Sequence | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  let query = supabase
    .from('sequences')
    .select('data')
    .eq('local_id', localId)
    .eq('is_public', true);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
