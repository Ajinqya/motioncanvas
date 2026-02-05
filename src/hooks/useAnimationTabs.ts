import { useCallback, useEffect, useMemo, useState } from 'react';

export interface AnimationTab {
  id: string;
  name: string;
}

export interface TabOrganization {
  tabs: AnimationTab[];
  assignments: Record<string, string>;
}

const TABS_STORAGE_KEY = 'animation-tabs.v1';
const ASSIGNMENTS_STORAGE_KEY = 'animation-tab-assignments.v1';

const DEFAULT_TABS: AnimationTab[] = [
  { id: 'logos', name: 'Logos' },
  { id: 'backgrounds-patterns', name: 'Backgrounds & Patterns' },
  { id: 'icons', name: 'Icons' },
  { id: 'data', name: 'Data' },
];

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

export function useAnimationTabs() {
  const [tabs, setTabs] = useState<AnimationTab[]>(() => {
    const stored = safeParseJson<AnimationTab[]>(localStorage.getItem(TABS_STORAGE_KEY));
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

  // On mount, try to load file-based defaults when localStorage is empty
  useEffect(() => {
    const hasLocalTabs = localStorage.getItem(TABS_STORAGE_KEY);
    if (hasLocalTabs) return;

    fetch('/api/tab-defaults')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TabOrganization | null) => {
        if (!data) return;
        if (Array.isArray(data.tabs) && data.tabs.length > 0) {
          setTabs(data.tabs);
        }
        if (data.assignments && typeof data.assignments === 'object') {
          setAssignments(data.assignments);
        }
      })
      .catch(() => {
        // file-based defaults not available
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch (error) {
      console.error('Failed to save animation tabs:', error);
    }
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
    } catch (error) {
      console.error('Failed to save animation tab assignments:', error);
    }
  }, [assignments]);

  const allTabs = useMemo<AnimationTab[]>(() => [{ id: 'all', name: 'All' }, ...tabs], [tabs]);

  const addTab = useCallback((name: string): AnimationTab => {
    const trimmed = name.trim();
    const baseId = slugify(trimmed);
    let newTab: AnimationTab = { id: baseId, name: trimmed || 'New tab' };

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
      for (const [animId, tid] of Object.entries(prev)) {
        if (tid !== tabId) next[animId] = tid;
      }
      return next;
    });
  }, []);

  const moveAnimationToTab = useCallback((animationId: string, tabId: string | null) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (!tabId || tabId === 'all') {
        delete next[animationId];
        return next;
      }
      next[animationId] = tabId;
      return next;
    });
  }, []);

  const getAnimationTab = useCallback(
    (animationId: string): string | null => assignments[animationId] ?? null,
    [assignments],
  );

  /** Save current tabs + assignments to disk so they survive localStorage clears */
  const saveAsDefault = useCallback(async (): Promise<boolean> => {
    try {
      const payload: TabOrganization = { tabs, assignments };
      const res = await fetch('/api/save-tab-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save tab defaults:', err);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to save tab defaults:', error);
      return false;
    }
  }, [tabs, assignments]);

  return {
    tabs,
    allTabs,
    assignments,
    addTab,
    deleteTab,
    moveAnimationToTab,
    getAnimationTab,
    saveAsDefault,
  };
}
