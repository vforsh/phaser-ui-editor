import fs from 'node:fs'
import path from 'node:path'

import type { EditorctlClient, EditorctlClientOptions } from './client'
import type { PickEditorOptions } from './discovery/pickEditor'

import { createClient } from './client'
import { discoverEditors, type DiscoveredEditor, type DiscoverEditorsOptions } from './discovery/discoverEditors'
import { pickEditor } from './discovery/pickEditor'
import { PickEditorError } from './discovery/PickEditorError'
import { pingEditor } from './discovery/ping'

/**
 * Options for {@link connect}.
 */
export type ConnectOptions = {
	/**
	 * Selection options for picking the editor instance.
	 *
	 * If omitted (or provided as an empty object), the default selection policy is:
	 * - Prefer an editor launched from the same repo directory as the running script (the nearest parent dir containing `package.json`)
	 * - Else, try `process.env.EDITOR_CONTROL_WS_PORT` (direct port ping, bypasses registry)
	 * - Else, pick the latest started editor among discovered instances
	 */
	pick?: PickEditorOptions
	/**
	 * Options for discovering running editor instances.
	 */
	discovery?: DiscoverEditorsOptions
	/**
	 * Configuration for the RPC client (timeouts, retries, etc.).
	 */
	client?: Omit<EditorctlClientOptions, 'port'>
}

/**
 * Result of {@link connect}.
 */
export type ConnectResult = {
	/**
	 * The typed RPC client connected to the editor.
	 */
	client: EditorctlClient
	/**
	 * The record of the editor instance that was picked.
	 */
	editor: DiscoveredEditor
}

/**
 * Picks an editor instance and creates a connected RPC client in one step.
 *
 * This is the recommended "one-liner" for setup in most scripts.
 *
 * @param options - Connection and selection options.
 * @returns A promise resolving to the client and picked editor record.
 * @throws {PickEditorError} If no suitable editor can be found.
 * @throws {Error} If connection or client creation fails.
 *
 * @example
 * ```ts
 * import { connect } from '@tekton/editorctl-client'
 *
 * // Setup with default selection policy
 * const { client } = await connect()
 * await client.ping()
 *
 * // Connect to a specific project
 * const { client } = await connect({
 *   pick: { prefer: { projectPathIncludes: 'my-game' } }
 * })
 * ```
 */
export async function connect(options: ConnectOptions = {}): Promise<ConnectResult> {
	const prefer = options.pick?.prefer
	const preferKeys = Object.keys(prefer ?? {})

	// Special-case: port preference can bypass registry discovery.
	if (prefer?.port !== undefined) {
		if (preferKeys.length > 1) {
			throw new PickEditorError(
				`Exactly one prefer criterion is allowed, but received: ${preferKeys.join(', ')}.`,
				'invalid-prefer',
				options.pick ?? {},
				undefined,
				{ providedKeys: preferKeys },
			)
		}

		let editor: DiscoveredEditor
		try {
			editor = await pingEditor({
				port: prefer.port,
				timeoutMs: options.discovery?.pingTimeoutMs ?? 400,
			})
		} catch (error) {
			throw new PickEditorError(
				`Failed to connect to editor on port ${prefer.port}: ${(error as Error).message}`,
				'ping-failed',
				options.pick ?? {},
				undefined,
				{ port: prefer.port },
				{ cause: error },
			)
		}

		const client = createClient({
			...options.client,
			port: editor.wsPort,
			instanceId: editor.instanceId,
		})

		return { client, editor }
	}

	const discovered = await discoverEditors(options.discovery)

	if (isDefaultPickMode(options.pick)) {
		const repoRoot = await findNearestRepoRoot(process.cwd())

		// 1) Prefer: same app launch dir (repo root)
		if (discovered.length > 0) {
			try {
				const editor = await pickEditor(discovered, { prefer: { appLaunchDir: repoRoot }, fallback: 'error' })
				const client = createClient({
					...options.client,
					port: editor.wsPort,
					instanceId: editor.instanceId,
				})

				return { client, editor }
			} catch {
				// Intentionally continue to env-port, then latest fallback.
			}
		}

		// 2) Prefer: env var port (bypasses registry). If it fails, continue to latest.
		const envPort = getEditorControlWsPortFromEnv()
		if (envPort !== null) {
			try {
				const editor = await pingEditor({
					port: envPort,
					timeoutMs: options.discovery?.pingTimeoutMs ?? 400,
				})

				const client = createClient({
					...options.client,
					port: editor.wsPort,
					instanceId: editor.instanceId,
				})

				return { client, editor }
			} catch {
				// Intentionally continue to latest fallback.
			}
		}

		// 3) Fallback: latest among discovered
		const editor = await pickEditor(discovered)
		const client = createClient({
			...options.client,
			port: editor.wsPort,
			instanceId: editor.instanceId,
		})

		return { client, editor }
	}

	const editor = await pickEditor(discovered, options.pick)

	const client = createClient({
		...options.client,
		port: editor.wsPort,
		instanceId: editor.instanceId,
	})

	return { client, editor }
}

function isDefaultPickMode(pick: PickEditorOptions | undefined): boolean {
	if (!pick) return true

	const preferKeys = Object.keys(pick.prefer ?? {})
	if (preferKeys.length > 0) return false

	return pick.fallback === undefined
}

function getEditorControlWsPortFromEnv(): number | null {
	const raw = process.env.EDITOR_CONTROL_WS_PORT
	if (!raw) return null

	const port = Number.parseInt(raw, 10)
	if (!Number.isFinite(port) || port <= 0) return null

	return port
}

async function findNearestRepoRoot(startDir: string): Promise<string> {
	let dir = startDir

	// Guard: normalize once up front for consistent traversal.
	try {
		dir = await fs.promises.realpath(dir)
	} catch {
		dir = path.resolve(dir)
	}

	while (true) {
		const candidate = path.join(dir, 'package.json')
		if (await fileExists(candidate)) {
			return dir
		}

		const parent = path.dirname(dir)
		if (parent === dir) {
			// Not a repo checkout; best-effort fallback to the resolved starting directory.
			return dir
		}
		dir = parent
	}
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath, fs.constants.F_OK)
		return true
	} catch {
		return false
	}
}
