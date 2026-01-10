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
	 * If omitted, the latest started editor will be picked.
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
 * // Setup with default "latest" policy
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
	const editor = await pickEditor(discovered, options.pick)

	const client = createClient({
		...options.client,
		port: editor.wsPort,
		instanceId: editor.instanceId,
	})

	return { client, editor }
}
