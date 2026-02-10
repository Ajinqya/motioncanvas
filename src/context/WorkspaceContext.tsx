import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { SavedSequenceMeta } from '../runtime/sequence-storage';
import {
  saveSequenceCloud,
  loadSequenceCloud,
  loadPublicSequenceCloud,
  listSequencesCloud,
  deleteSequenceCloud,
  promoteSequenceCloud,
  demoteSequenceCloud,
} from '../lib/sequence-cloud';
import {
  saveAnimationCloud,
  listWorkspaceAnimationsCloud,
  promoteAnimationCloud,
  demoteAnimationCloud,
  deleteAnimationCloud,
  type CloudAnimationMeta,
  type CloudAnimationInput,
} from '../lib/animation-cloud';
import type { Sequence } from '../runtime/sequence';

export interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  sequences: SavedSequenceMeta[];
  sequencesLoading: boolean;
  animations: CloudAnimationMeta[];
  animationsLoading: boolean;
  refreshSequences: () => Promise<void>;
  refreshAnimations: () => Promise<void>;
  saveSequence: (seq: Sequence) => Promise<{ error: Error | null }>;
  loadSequence: (id: string) => Promise<Sequence | null>;
  deleteSequence: (id: string) => Promise<{ error: Error | null }>;
  promoteSequence: (id: string) => Promise<{ error: Error | null }>;
  demoteSequence: (id: string) => Promise<{ error: Error | null }>;
  saveAnimation: (input: CloudAnimationInput) => Promise<{ localId: string; error: Error | null }>;
  promoteAnimation: (localId: string) => Promise<{ error: Error | null }>;
  demoteAnimation: (localId: string) => Promise<{ error: Error | null }>;
  deleteAnimation: (localId: string) => Promise<{ error: Error | null }>;
  useCloud: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sequences, setSequences] = useState<SavedSequenceMeta[]>([]);
  const [sequencesLoading, setSequencesLoading] = useState(false);
  const [animations, setAnimations] = useState<CloudAnimationMeta[]>([]);
  const [animationsLoading, setAnimationsLoading] = useState(false);
  const useCloud = !!(isConfigured && user && supabase && workspace);

  /** Ensure user has at least one workspace; create default if none */
  const ensureWorkspace = useCallback(async () => {
    if (!user || !supabase) return null;

    const { data: members } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name)')
      .eq('user_id', user.id);

    type MemberRow = {
      workspace_id: string;
      workspaces: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const existing = (members ?? []).map((m: MemberRow) => {
      const ws = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
      return ws ? { id: ws.id, name: ws.name } : { id: m.workspace_id, name: 'Workspace' };
    });

    if (existing.length > 0) {
      const ws = { id: existing[0].id, name: existing[0].name };
      setWorkspaces(existing.map((w) => ({ id: w.id, name: w.name })));
      setWorkspace(ws);
      return ws;
    }

    const { data: newWs, error: createErr } = await supabase
      .from('workspaces')
      .insert({ name: 'My Workspace' })
      .select('id, name')
      .single();

    if (createErr || !newWs) return null;

    const { error: memberErr } = await supabase.from('workspace_members').insert({
      workspace_id: newWs.id,
      user_id: user.id,
      role: 'owner',
    });

    if (memberErr) return null;

    const ws = { id: newWs.id, name: newWs.name };
    setWorkspaces([ws]);
    setWorkspace(ws);
    return ws;
  }, [user]);

  const refreshSequences = useCallback(async () => {
    if (!workspace) return;
    setSequencesLoading(true);
    const { data, error } = await listSequencesCloud(workspace.id);
    setSequencesLoading(false);
    if (!error) setSequences(data);
  }, [workspace]);

  const refreshAnimations = useCallback(async () => {
    if (!workspace) return;
    setAnimationsLoading(true);
    const { data, error } = await listWorkspaceAnimationsCloud(workspace.id);
    setAnimationsLoading(false);
    if (!error) setAnimations(data);
  }, [workspace]);

  useEffect(() => {
    if (!(isConfigured && user && supabase)) {
      setWorkspaces([]);
      setWorkspace(null);
      setSequences([]);
      setAnimations([]);
      return;
    }
    ensureWorkspace();
  }, [isConfigured, user?.id, ensureWorkspace]);

  useEffect(() => {
    if (!workspace) return;
    refreshSequences();
    refreshAnimations();
  }, [workspace?.id]);

  const saveSequence = useCallback(
    async (seq: Sequence) => {
      if (!workspace) return { error: new Error('No workspace') };
      return saveSequenceCloud(workspace.id, seq);
    },
    [workspace]
  );

  const loadSequence = useCallback(
    async (id: string) => {
      if (!workspace) return null;
      const { data } = await loadSequenceCloud(workspace.id, id);
      if (data) return data;
      const { data: publicData } = await loadPublicSequenceCloud(id);
      return publicData;
    },
    [workspace]
  );

  const deleteSequence = useCallback(
    async (id: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return deleteSequenceCloud(workspace.id, id);
    },
    [workspace]
  );

  const promoteSequence = useCallback(
    async (id: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return promoteSequenceCloud(workspace.id, id, user?.id ?? null, user?.email ?? null);
    },
    [workspace, user?.id, user?.email]
  );

  const demoteSequence = useCallback(
    async (id: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return demoteSequenceCloud(workspace.id, id);
    },
    [workspace]
  );

  const saveAnimation = useCallback(
    async (input: CloudAnimationInput) => {
      if (!workspace) return { localId: '', error: new Error('No workspace') };
      return saveAnimationCloud(workspace.id, user?.id ?? null, input);
    },
    [workspace, user?.id]
  );

  const promoteAnimation = useCallback(
    async (localId: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return promoteAnimationCloud(workspace.id, localId, user?.email ?? null);
    },
    [workspace, user?.email]
  );

  const demoteAnimation = useCallback(
    async (localId: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return demoteAnimationCloud(workspace.id, localId);
    },
    [workspace]
  );

  const deleteAnimation = useCallback(
    async (localId: string) => {
      if (!workspace) return { error: new Error('No workspace') };
      return deleteAnimationCloud(workspace.id, localId);
    },
    [workspace]
  );

  const value: WorkspaceContextValue = {
    workspace,
    workspaces,
    sequences,
    sequencesLoading,
    animations,
    animationsLoading,
    refreshSequences,
    refreshAnimations,
    saveSequence,
    loadSequence,
    deleteSequence,
    promoteSequence,
    demoteSequence,
    saveAnimation,
    promoteAnimation,
    demoteAnimation,
    deleteAnimation,
    useCloud,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
