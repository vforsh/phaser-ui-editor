import fs from 'node:fs'
import path from 'node:path'

import type { DiscoveredEditor } from './discoverEditors'

import { PickEditorError } from './PickEditorError'

/**
 * Selection criteria for preferring a specific editor instance.
 *
 * Exactly one field must be provided if `prefer` is used.
 */
export type PickEditorPrefer = {
	/**
	 * Prefer an editor whose control WebSocket is running on this port.
	 */
	port?: number
	/**
	 * Prefer an editor whose application launch directory is exactly this path.
	 *
	 * Both the target path and candidate paths are normalized (realpath) before comparison.
	 */
	appLaunchDir?: string
	/**
	 * Prefer an editor whose application launch directory includes this string.
	 */
	appLaunchDirIncludes?: string
	/**
	 * Prefer an editor whose open project path is exactly this path.
	 *
	 * Both the target path and candidate paths are normalized (realpath) before comparison.
	 */
	projectPath?: string
	/**
	 * Prefer an editor whose open project path includes this string.
	 */
	projectPathIncludes?: string
}

/**
 * Options for {@link pickEditor}.
 */
export type PickEditorOptions = {
	/**
	 * Selection criteria for preferring a specific editor instance.
	 * If omitted or empty, all discovered editors are considered.
	 */
	prefer?: PickEditorPrefer
	/**
	 * Behavior when no editor matches the `prefer` criteria.
	 *
	 * - `latest`: Pick the latest started editor among all discovered instances.
	 * - `error`: Throw a {@link PickEditorError}.
	 *
	 * @default 'latest'
	 */
	fallback?: 'latest' | 'error'
}

/**
 * Selects exactly one Tekton Editor instance based on the provided criteria.
 *
 * This function encapsulates the policy for choosing the "right" editor instance
 * for automation and scripts.
 *
 * @param options - Selection and discovery options.
 * @returns A promise that resolves to the selected editor instance record.
 * @throws {PickEditorError} If no suitable editor can be found or if options are invalid.
 *
 * @example
 * ```ts
 * import { discoverEditors, pickEditor } from '@tekton/editorctl-client'
 *
 * const editors = await discoverEditors()
 *
 * // Pick the latest started editor (default)
 * const editor = await pickEditor(editors)
 *
 * // Pick an editor by project path
 * const editor2 = await pickEditor(editors, { prefer: { projectPathIncludes: 'my-project' } })
 * ```
 */
export async function pickEditor(editors: DiscoveredEditor[], options: PickEditorOptions = {}): Promise<DiscoveredEditor> {
	const { prefer, fallback = 'latest' } = options

	// 1. Validate prefer shape
	const preferKeys = Object.keys(prefer ?? {}) as (keyof PickEditorPrefer)[]
	if (preferKeys.length > 1) {
		throw new PickEditorError(
			`Exactly one prefer criterion is allowed, but received: ${preferKeys.join(', ')}.`,
			'invalid-prefer',
			options,
			undefined,
			{ providedKeys: preferKeys },
		)
	}

	// 2. Validate input list
	if (editors.length === 0) {
		throw new PickEditorError('No editors provided.', 'no-editors', options, editors)
	}

	// 3. Apply selection filters
	let candidates = editors

	if (prefer?.appLaunchDir !== undefined) {
		const target = await normalizePath(prefer.appLaunchDir)
		const results = await Promise.all(
			editors.map(async (entry) => {
				const candidate = await normalizePath(entry.appLaunchDir)
				return candidate === target ? entry : null
			}),
		)
		candidates = results.filter((entry): entry is DiscoveredEditor => entry !== null)
	} else if (prefer?.appLaunchDirIncludes !== undefined) {
		const value = prefer.appLaunchDirIncludes
		candidates = editors.filter((entry) => entry.appLaunchDir.includes(value))
	} else if (prefer?.port !== undefined) {
		const port = prefer.port
		candidates = editors.filter((entry) => entry.wsPort === port)
	} else if (prefer?.projectPath !== undefined) {
		const target = await normalizePath(prefer.projectPath)
		const results = await Promise.all(
			editors.map(async (entry) => {
				if (entry.projectPath === null) return null
				const candidate = await normalizePath(entry.projectPath)
				return candidate === target ? entry : null
			}),
		)
		candidates = results.filter((entry): entry is DiscoveredEditor => entry !== null)
	} else if (prefer?.projectPathIncludes !== undefined) {
		const value = prefer.projectPathIncludes
		candidates = editors.filter((entry) => (entry.projectPath ?? '').includes(value))
	}

	// 4. Handle no matches
	if (candidates.length === 0) {
		if (fallback === 'error') {
			const filterKey = preferKeys[0]
			const filterValue = prefer ? (prefer as any)[filterKey] : undefined
			throw new PickEditorError(`No editor matched ${filterKey}='${filterValue}'.`, 'no-match', options, editors, {
				includesValue: filterValue,
			})
		}
		// Fallback to latest among all provided
		candidates = editors
	}

	// 5. Pick latest among candidates
	return pickLatest(candidates)
}

/**
 * Returns the "latest" editor from a list of candidates.
 *
 * "Latest" is defined as the highest `startedAt` timestamp.
 * Ties are broken by `updatedAt`, then by `wsPort` for determinism.
 */
function pickLatest(candidates: DiscoveredEditor[]): DiscoveredEditor {
	return [...candidates].sort((a, b) => {
		// Primary: latest startedAt
		if (b.startedAt !== a.startedAt) {
			return b.startedAt - a.startedAt
		}
		// Secondary: latest updatedAt
		if (b.updatedAt !== a.updatedAt) {
			return b.updatedAt - a.updatedAt
		}
		// Deterministic tie-breaker: wsPort
		return b.wsPort - a.wsPort
	})[0]
}

/**
 * Normalizes a path by resolving symlinks (realpath) and making it absolute.
 *
 * Fallback to `path.resolve` if the path doesn't exist on disk.
 */
async function normalizePath(p: string): Promise<string> {
	try {
		return await fs.promises.realpath(p)
	} catch {
		return path.resolve(p)
	}
}
