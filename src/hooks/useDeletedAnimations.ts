import { useState, useEffect } from 'react';

const STORAGE_KEY = 'deleted-animations';

export function useDeletedAnimations() {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...deletedIds]));
    } catch (error) {
      console.error('Failed to save deleted animations:', error);
    }
  }, [deletedIds]);

  const deleteAnimation = (id: string) => {
    setDeletedIds(prev => new Set([...prev, id]));
  };

  const restoreAnimation = (id: string) => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const isDeleted = (id: string) => deletedIds.has(id);

  return {
    deleteAnimation,
    restoreAnimation,
    isDeleted,
  };
}
