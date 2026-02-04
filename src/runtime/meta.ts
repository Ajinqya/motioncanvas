import type { AnimationMeta } from './types';

/**
 * Create a new animation metadata object
 */
export function createMeta(
  opts: Omit<AnimationMeta, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }
): AnimationMeta {
  const now = new Date().toISOString();
  return {
    ...opts,
    createdAt: opts.createdAt ?? now,
    updatedAt: opts.updatedAt ?? now,
  };
}

/**
 * Update metadata with new timestamp
 */
export function updateMeta(
  meta: AnimationMeta,
  updates: Partial<Omit<AnimationMeta, 'id' | 'createdAt'>>
): AnimationMeta {
  return {
    ...meta,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}
