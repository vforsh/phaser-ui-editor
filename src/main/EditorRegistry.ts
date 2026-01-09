import { BrowserWindow } from 'electron'

/**
 * Metadata for an active editor instance.
 */
export type EditorInfo = {
	windowId: number
	projectPath: string | null
}

/**
 * Maintains a registry of active editor windows and their associated project paths.
 *
 * This registry acts as the source of truth for editor discovery. It merges
 * transient Electron window state with project state pushed from renderers.
 */
class EditorRegistry {
	private readonly projectPaths = new Map<number, string | null>()
	private primaryWindowId: number | null = null

	/**
	 * Updates the known project path for a specific window.
	 */
	setProjectPath(windowId: number, path: string | null): void {
		this.projectPaths.set(windowId, path)
	}

	/**
	 * Sets the primary window id for discovery metadata.
	 */
	setPrimaryWindowId(windowId: number | null): void {
		this.primaryWindowId = windowId
	}

	/**
	 * Returns the preferred project path for discovery metadata.
	 */
	getPrimaryProjectPath(preferredWindowId?: number | null): string | null {
		const windows = BrowserWindow.getAllWindows()
		if (windows.length === 0) {
			return null
		}

		const candidateId = preferredWindowId ?? this.primaryWindowId
		const resolvedId = candidateId && windows.some((win) => win.id === candidateId) ? candidateId : windows[0].id
		const candidatePath = this.projectPaths.get(resolvedId)
		if (candidatePath !== undefined) {
			return candidatePath ?? null
		}

		const fallback = this.getEditors()[0]
		return fallback?.projectPath ?? null
	}

	/**
	 * Returns a list of all currently active editor windows with their project info.
	 */
	getEditors(): EditorInfo[] {
		const windows = BrowserWindow.getAllWindows()
		const activeIds = new Set(windows.map((win) => win.id))

		// Prune entries for windows that no longer exist
		for (const id of this.projectPaths.keys()) {
			if (!activeIds.has(id)) {
				this.projectPaths.delete(id)
			}
		}

		return windows.map((win) => ({
			windowId: win.id,
			projectPath: this.projectPaths.get(win.id) ?? null,
		}))
	}

	/**
	 * Cleans up registry entries for a closed window.
	 */
	removeWindow(windowId: number): void {
		this.projectPaths.delete(windowId)
	}
}

export const editorRegistry = new EditorRegistry()
