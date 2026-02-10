/**
 * Cloud persistence for user-created animations (paste code or AI).
 */

import { supabase } from './supabase';
import { compileCustomCode } from '../runtime/custom-code';
import type { AnyAnimationDefinition } from '../runtime/types';
import type { CustomCodeConfig } from '../runtime/sequence';

export interface CloudAnimationMeta {
  id: string;
  localId: string;
  name: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
  creatorEmail?: string | null;
}

export interface CloudAnimationInput {
  name: string;
  code: string;
  config?: CustomCodeConfig;
}

/** Save animation to workspace */
export async function saveAnimationCloud(
  workspaceId: string,
  userId: string | null,
  input: CloudAnimationInput
): Promise<{ localId: string; error: Error | null }> {
  if (!supabase) return { localId: '', error: new Error('Supabase not configured') };

  const localId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const config = input.config ?? { name: input.name };

  const { error } = await supabase.from('animations').upsert(
    {
      workspace_id: workspaceId,
      created_by: userId,
      local_id: localId,
      name: input.name,
      code: input.code,
      config: config,
      is_public: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,local_id' }
  );

  return { localId, error: error ? new Error(error.message) : null };
}

/** List public animations (for anonymous and all users) */
export async function listPublicAnimationsCloud(): Promise<{
  data: CloudAnimationMeta[];
  error: Error | null;
}> {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('animations')
    .select('id, local_id, name, is_public, created_at, updated_at, created_by, creator_email')
    .eq('is_public', true)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };

  const list: CloudAnimationMeta[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    localId: String(r.local_id),
    name: String(r.name),
    isPublic: Boolean(r.is_public),
    createdAt: new Date((r.created_at as string)).getTime(),
    updatedAt: new Date((r.updated_at as string)).getTime(),
    createdBy: (r.created_by as string | null) ?? null,
    creatorEmail: (r.creator_email as string | null) ?? null,
  }));

  return { data: list, error: null };
}

/** List workspace animations */
export async function listWorkspaceAnimationsCloud(
  workspaceId: string
): Promise<{ data: CloudAnimationMeta[]; error: Error | null }> {
  if (!supabase) return { data: [], error: new Error('Supabase not configured') };

  const { data, error } = await supabase
    .from('animations')
    .select('id, local_id, name, is_public, created_at, updated_at, created_by, creator_email')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };

  const list: CloudAnimationMeta[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    localId: String(r.local_id),
    name: String(r.name),
    isPublic: Boolean(r.is_public),
    createdAt: new Date((r.created_at as string)).getTime(),
    updatedAt: new Date((r.updated_at as string)).getTime(),
    createdBy: (r.created_by as string | null) ?? null,
    creatorEmail: (r.creator_email as string | null) ?? null,
  }));

  return { data: list, error: null };
}

/** Load animation by id (workspace or public) */
export async function loadAnimationCloud(
  localId: string,
  workspaceId?: string | null
): Promise<{
  data: { definition: AnyAnimationDefinition; code: string; config: CustomCodeConfig } | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };

  // Try workspace first when signed in (for private animations), then fall back to any accessible row (public)
  if (workspaceId) {
    const { data: wsData, error: wsError } = await supabase
      .from('animations')
      .select('code, config')
      .eq('workspace_id', workspaceId)
      .eq('local_id', localId)
      .maybeSingle();

    if (!wsError && wsData) {
      const code = (wsData as { code: string }).code;
      const rawConfig = (wsData as { config?: unknown }).config;
      const config: CustomCodeConfig =
        rawConfig && typeof rawConfig === 'object'
          ? (rawConfig as CustomCodeConfig)
          : { name: 'Custom' };

      const compiled = compileCustomCode(code, config);
      if (compiled) {
        const def = { ...compiled, id: localId };
        return {
          data: { definition: def as AnyAnimationDefinition, code, config },
          error: null,
        };
      }
    }
  }

  const { data, error } = await supabase
    .from('animations')
    .select('code, config')
    .eq('local_id', localId)
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };

  const code = (data as { code: string }).code;
  const rawConfig = (data as { config?: unknown }).config;
  const config: CustomCodeConfig =
    rawConfig && typeof rawConfig === 'object'
      ? (rawConfig as CustomCodeConfig)
      : { name: 'Custom' };

  const compiled = compileCustomCode(code, config);
  if (!compiled) return { data: null, error: new Error('Failed to compile animation') };

  // Ensure id for lookup
  const def = { ...compiled, id: localId };
  return {
    data: { definition: def as AnyAnimationDefinition, code, config },
    error: null,
  };
}

/** Promote animation to public */
export async function promoteAnimationCloud(
  workspaceId: string,
  localId: string,
  creatorEmail?: string | null
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('animations')
    .update({
      is_public: true,
      creator_email: creatorEmail ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}

/** Demote animation to private */
export async function demoteAnimationCloud(
  workspaceId: string,
  localId: string
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('animations')
    .update({
      is_public: false,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}

/** Delete animation */
export async function deleteAnimationCloud(
  workspaceId: string,
  localId: string
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };

  const { error } = await supabase
    .from('animations')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('local_id', localId);

  return { error: error ? new Error(error.message) : null };
}
