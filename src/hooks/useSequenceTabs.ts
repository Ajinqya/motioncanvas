import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SequenceTab {
  id: string;
  name: string;
}

const TABS_STORAGE_KEY = 'sequence-tabs.v1';
const ASSIGNMENTS_STORAGE_KEY = 'sequence-tab-assignments.v1';

const DEFAULT_TABS: SequenceTab[] = [];

function safeParseJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'tab';
}

function dedupeId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function useSequenceTabs() {
  const [tabs, setTabs] = useState<SequenceTab[]>(() => {
    const stored = safeParseJson<SequenceTab[]>(localStorage.getItem(TABS_STORAGE_KEY));
    if (Array.isArray(stored) && stored.every((t) => t && typeof t.id === 'string' && typeof t.name === 'string')) {
      return stored;
    }
    return DEFAULT_TABS;
  });

  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const stored = safeParseJson<Record<string, string>>(localStorage.getItem(ASSIGNMENTS_STORAGE_KEY));
    if (stored && typeof stored === 'object') return stored;
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch (error) {
      console.error('Failed to save sequence tabs:', error);
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    } catch (error) {
      console.error('Failed to save sequence tab assignments:', error);
    }
  }, [assignments]);

  const allTabs = useMemo<SequenceTab[]>(() => [{ id: 'all', name: 'All' }, ...tabs], [tabs]);

  const addTab = useCallback((name: string): SequenceTab => {
    const trimmed = name.trim();
    const baseId = slugify(trimmed);
    let newTab: SequenceTab = { id: baseId, name: trimmed || 'New tab' };

    setTabs((prev) => {
      const existing = new Set(prev.map((t) => t.id).concat(['all']));
      const id = dedupeId(baseId, existing);
      newTab = { id, name: trimmed || 'New tab' };
      return [...prev, newTab];
    });

    return newTab;
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    if (tabId === 'all') return;
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setAssignments((prev) => {
      const next: Record<string, string> = {};
      for (const [seqId, tid] of Object.entries(prev)) {
        if (tid !== tabId) next[seqId] = tid;
      }
      return next;
    });
  }, []);

  const moveSequenceToTab = useCallback((sequenceId: string, tabId: string | null) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (!tabId || tabId === 'all') {
        delete next[sequenceId];
        return next;
      }
      next[sequenceId] = tabId;
      return next;
    });
  }, []);

  const getSequenceTab = useCallback(
    (sequenceId: string): string | null => assignments[sequenceId] ?? null,
    [assignments],
  );

  return {
    tabs,
    allTabs,
    assignments,
    addTab,
    deleteTab,
    moveSequenceToTab,
    getSequenceTab,
  };
}
