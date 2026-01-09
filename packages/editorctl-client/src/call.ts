import type { ControlInput, ControlMethod, ControlOutput } from '@tekton/control-rpc-contract'

import type { DiscoveredEditor } from './discovery/discoverEditors'

import { RpcClient } from './rpc/client'
import { WsTransport } from './transport/ws'

/**
 * Options for performing a single control RPC call without creating a long-lived client.
 */
export type OneShotCallOptions = {
	/**
	 * WebSocket port exposed by the running Tekton Editor control RPC server.
	 */
	wsPort: number
	/**
	 * Maximum number of WS reconnect attempts for a single request.
	 * @defaultValue 3
	 */
	maxAttempts?: number
	/**
	 * Base delay in milliseconds before retrying a request.
	 * @defaultValue 100
	 */
	retryDelay?: number
	/**
	 * Timeout (in milliseconds) to wait for a single request/response roundtrip.
	 * @defaultValue 30000
	 */
	timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * A lightweight client for performing one-shot control RPC calls.
 */
export interface OneShotClient {
	/**
	 * Performs a single control RPC call against the editor.
	 *
	 * Each call opens a new websocket connection and closes it after receiving the response.
	 */
	call<M extends ControlMethod>(method: M, input?: ControlInput<M>): Promise<ControlOutput<M>>
}

/**
 * Creates a one-shot client for a running Tekton Editor using its WebSocket port.
 *
 * @param port - WebSocket port of the editor instance.
 * @param options - Optional transport settings (timeout, retries).
 * @returns A client object with a `call` method.
 *
 * @example
 * ```ts
 * import { withEditorPort } from '@tekton/editorctl-client'
 *
 * await withEditorPort(17870).call('ping', {})
 * ```
 */
export function withEditorPort(port: number, options: Omit<OneShotCallOptions, 'wsPort'> = {}): OneShotClient {
	return {
		call: <M extends ControlMethod>(method: M, input?: ControlInput<M>) => oneShotCall({ ...options, wsPort: port }, method, input),
	}
}

/**
 * Creates a one-shot client for a discovered Tekton Editor instance.
 *
 * @param editor - A discovered editor record (from `discoverEditors`).
 * @param options - Optional transport settings (timeout, retries).
 * @returns A client object with a `call` method.
 *
 * @example
 * ```ts
 * import { withEditor, discoverEditors } from '@tekton/editorctl-client'
 *
 * const [editor] = await discoverEditors()
 * if (editor) {
 *   await withEditor(editor).call('ping', {})
 * }
 * ```
 */
export function withEditor(editor: DiscoveredEditor, options: Omit<OneShotCallOptions, 'wsPort'> = {}): OneShotClient {
	return withEditorPort(editor.wsPort, options)
}

/**
 * Internal helper to perform a single one-shot call.
 */
async function oneShotCall<M extends ControlMethod>(
	options: OneShotCallOptions,
	method: M,
	input?: ControlInput<M>,
): Promise<ControlOutput<M>> {
	const params = (input ?? {}) as ControlInput<M>
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

	const transport = new WsTransport({
		port: options.wsPort,
		maxAttempts: options.maxAttempts,
		retryDelay: options.retryDelay,
		timeoutMs,
	})
	const rpc = new RpcClient(transport)
	return rpc.request(method, params)
}
