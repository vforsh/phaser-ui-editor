import process from 'node:process'

/**
 * The runtime mode of the editorctl CLI.
 *
 * - `dev`: Running via tsx with a `.ts` entrypoint (repo development).
 * - `built`: Running via the compiled `.js` entrypoint (npm package or local build).
 */
export type EditorctlRuntimeMode = 'dev' | 'built'

/**
 * Detects the runtime mode of the editorctl CLI.
 *
 * - Returns `'dev'` if the entrypoint ends with `.ts` (typical tsx usage in repo).
 * - Returns `'built'` otherwise (compiled JS entrypoint).
 *
 * This is used to enforce strict worktree targeting only during development.
 */
export function getEditorctlRuntimeMode(): EditorctlRuntimeMode {
	const entry = process.argv[1]

	if (typeof entry !== 'string' || entry === '') {
		return 'built'
	}

	if (entry.endsWith('.ts')) {
		return 'dev'
	}

	return 'built'
}
