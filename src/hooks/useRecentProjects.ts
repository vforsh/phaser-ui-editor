import { useCallback } from 'react';
import { state } from '../state/State';
import { useSnapshot } from 'valtio';

export function useRecentProjects() {
  const snap = useSnapshot(state);

  const removeProject = useCallback((projectDir: string) => {
    state.recentProjects = state.recentProjects.filter(
      (project) => project.dir !== projectDir
    );
  }, []);

  const checkProjectExists = useCallback((projectDir: string) => {
    try {
      // TODO replace with real call to fse.exist()
      return Math.random() > 0.25;
    } catch {
      return false;
    }
  }, []);

  // Sort projects by last opened date (most recent first)
  const recentProjects = [...snap.recentProjects].sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt
  ).slice(0, 5);

  return {
    recentProjects,
    removeProject,
    checkProjectExists,
  };
}