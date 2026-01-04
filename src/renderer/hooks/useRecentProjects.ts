import { backend } from '@backend/backend'
import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { state } from '../state/State'

export function useRecentProjects() {
	const snap = useSnapshot(state)
	const [existsMap, setExistsMap] = useState<Record<string, boolean>>({})

	const removeProject = useCallback((projectDir: string) => {
		state.recentProjects = state.recentProjects.filter((project) => project.dir !== projectDir)
	}, [])

	useEffect(() => {
		let canceled = false

		const checkProjects = async () => {
			const entries = await Promise.all(
				(snap.recentProjects ?? []).map(async (project) => {
					try {
						const exists = await backend.exists({ path: project.dir })
						return [project.dir, exists] as const
					} catch {
						return [project.dir, false] as const
					}
				}),
			)

			if (canceled) {
				return
			}

			const next: Record<string, boolean> = {}
			entries.forEach(([dir, exists]) => {
				next[dir] = exists
			})

			setExistsMap(next)
		}

		checkProjects()

		return () => {
			canceled = true
		}
	}, [snap.recentProjects])

	const checkProjectExists = useCallback((projectDir: string) => existsMap[projectDir] ?? true, [existsMap])

	// Sort projects by last opened date (most recent first)
	const recentProjects = [...snap.recentProjects].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt).slice(0, 5)

	return {
		recentProjects,
		removeProject,
		checkProjectExists,
	}
}
