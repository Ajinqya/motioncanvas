/**
 * Persistence for sequences: localStorage (quick save) and JSON file export/import.
 */

import type { Sequence } from './sequence';
import { getSequenceDurationMs } from './sequence';

/** Migrate old sequences that used audioUrl to the new audioClips array */
function migrateSequence(seq: Sequence): Sequence {
  const legacy = seq as Sequence & { audioUrl?: string; audioFilename?: string };
  if (legacy.audioUrl && (!seq.audioClips || seq.audioClips.length === 0)) {
    // Migrate the old single audioUrl to an audioClips entry
    seq.audioClips = [{
      clipId: `audio-migrated-${Date.now()}`,
      audioUrl: legacy.audioUrl,
      audioFilename: legacy.audioFilename ?? 'Audio track',
      fullDurationMs: 0, // Unknown — will be computed on load
      trimStartMs: 0,
      trimEndMs: 0, // 0 means full duration (resolved at runtime)
      volume: 1,
      startMs: 0,
      lane: -1,
      label: legacy.audioFilename ?? 'Audio track',
    }];
    delete legacy.audioUrl;
    delete legacy.audioFilename;
  }
  if (!seq.audioClips) seq.audioClips = [];
  return seq;
}

const STORAGE_KEY_PREFIX = 'clueso-sequence-';
const META_KEY = 'clueso-sequences-meta';

export interface SavedSequenceMeta {
  id: string;
  name: string;
  updatedAt: number;
  sceneCount: number;
  durationMs: number;
  width: number;
  height: number;
  isPublic?: boolean;
  creatorEmail?: string;
  /** Cloud only: workspace id for unambiguous loading when duplicate local_ids exist */
  workspaceId?: string;
}

function storageKey(id: string): string {
  return `${STORAGE_KEY_PREFIX}${id}`;
}

/** Save a sequence to localStorage */
export function saveSequence(seq: Sequence): void {
  const key = storageKey(seq.id);
  localStorage.setItem(key, JSON.stringify(seq));
  updateMeta(seq);
}

/** Update the meta index for a sequence */
function updateMeta(seq: Sequence): void {
  const list = listSavedSequences();
  const meta: SavedSequenceMeta = {
    id: seq.id,
    name: seq.name,
    updatedAt: Date.now(),
    sceneCount: seq.scenes.length,
    durationMs: getDuration(seq),
    width: seq.width,
    height: seq.height,
  };
  const rest = list.filter((m) => m.id !== seq.id);
  const next = [meta, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
  localStorage.setItem(META_KEY, JSON.stringify(next));
}

function getDuration(seq: Sequence): number {
  return getSequenceDurationMs(seq.scenes, seq.audioClips);
}

/** List all saved sequences (metadata only) */
export function listSavedSequences(): SavedSequenceMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Load a full sequence by id from localStorage */
export function loadSequence(id: string): Sequence | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const seq = JSON.parse(raw) as Sequence;
    return validateSequence(seq) ? migrateSequence(seq) : null;
  } catch {
    return null;
  }
}

/** Remove a sequence from localStorage */
export function deleteSavedSequence(id: string): void {
  localStorage.removeItem(storageKey(id));
  const list = listSavedSequences().filter((m) => m.id !== id);
  localStorage.setItem(META_KEY, JSON.stringify(list));
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

/** Export sequence as a JSON file (download) */
export function exportSequenceFile(seq: Sequence): void {
  const blob = new Blob([JSON.stringify(seq, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${seq.name.replace(/[^a-z0-9-_]/gi, '-') || 'sequence'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import sequence from a File; returns the parsed Sequence or null */
export async function importSequenceFile(file: File): Promise<Sequence | null> {
  const text = await file.text();
  try {
    const data = JSON.parse(text) as unknown;
    if (!validateSequence(data)) return null;
    // Ensure a fresh id so it doesn't overwrite an existing save
    return migrateSequence({ ...data, id: `seq-${Date.now()}` } as Sequence);
  } catch {
    return null;
  }
}
