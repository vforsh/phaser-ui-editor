import type { ControlInput, ControlMeta, ControlMetaMethod, ControlMethod, ControlOutput } from '@tekton/control-rpc-contract'

import { controlContract, isControlMethod } from '@tekton/control-rpc-contract'

import type { GeneratedControlMethods } from './__generated__/control-methods'
import type { DiscoveredEditor } from './discovery/discoverEditors'

import { RpcClient } from './rpc/client'
import { WsTransport } from './transport/ws'

/**
 * Connection options for {@link createEditorctlClient}.
 */
export interface EditorctlClientOptions {
	/**
	 * WebSocket port exposed by the running Tekton Editor control RPC server.
	 */
	port: number
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
}

/**
 * Typed client for the Tekton Editor control RPC.
 */
export interface EditorctlClientBase {
	/**
	 * Calls a control RPC method with the provided JSON params.
	 *
	 * @param method - Control RPC method name.
	 * @param input - JSON params object (omit or pass `{}` for no params).
	 * @returns The method output payload.
	 * @throws TransportError when the transport fails.
	 * @throws Error with `isRpcError` when the request fails at the JSON-RPC layer.
	 *
	 * @example
	 * ```ts
	 * const result = await client.call('ping', {})
	 * ```
	 */
	call<M extends ControlMethod>(method: M, input?: ControlInput<M>): Promise<ControlOutput<M>>
	/**
	 * Fetches the live control RPC discovery metadata from the running editor.
	 *
	 * @returns The discovery payload, including method list and JSON Schemas.
	 * @throws TransportError when the transport fails.
	 * @throws Error with `isRpcError` when the request fails at the JSON-RPC layer.
	 *
	 * @example
	 * ```ts
	 * const meta = await client.methods()
	 * console.log(meta.methods.map((entry) => entry.method))
	 * ```
	 */
	methods(): Promise<ControlMeta>
	/**
	 * Fetches the JSON schemas for a specific method using runtime discovery.
	 *
	 * @param method - Control RPC method name.
	 * @returns The input and output JSON Schemas for the method.
	 * @throws Error when the method cannot be found or the RPC fails.
	 *
	 * @example
	 * ```ts
	 * const schema = await client.schema('openProject')
	 * ```
	 */
	schema<M extends ControlMethod>(
		method: M,
	): Promise<{
		method: M
		inputSchema: ControlMetaMethod['inputSchema']
		outputSchema: ControlMetaMethod['outputSchema']
	}>
}

export interface EditorctlClient extends EditorctlClientBase, GeneratedControlMethods {}

class EditorctlClientImpl implements EditorctlClientBase {
	private rpc: RpcClient

	constructor(options: EditorctlClientOptions) {
		const transport = new WsTransport({
			port: options.port,
			maxAttempts: options.maxAttempts,
			retryDelay: options.retryDelay,
		})
		this.rpc = new RpcClient(transport)
	}

	async call<M extends ControlMethod>(method: M, input?: ControlInput<M>): Promise<ControlOutput<M>> {
		const params = (input ?? {}) as ControlInput<M>
		return this.rpc.request(method, params)
	}

	async methods(): Promise<ControlMeta> {
		return this.rpc.request('getControlMeta', {} as ControlInput<'getControlMeta'>)
	}

	async schema<M extends ControlMethod>(
		method: M,
	): Promise<{
		method: M
		inputSchema: ControlMetaMethod['inputSchema']
		outputSchema: ControlMetaMethod['outputSchema']
	}> {
		const meta = await this.methods()
		const entry = meta.methods.find((item) => item.method === method)
		if (!entry) {
			throw new Error(`Unknown method: ${method}`)
		}

		return {
			method,
			inputSchema: entry.inputSchema,
			outputSchema: entry.outputSchema,
		}
	}
}

const reservedMethodNames = new Set(['call', 'methods', 'schema'])

function attachControlMethods(client: EditorctlClientBase): void {
	for (const method of Object.keys(controlContract).sort()) {
		if (reservedMethodNames.has(method) || method in client) {
			continue
		}

		Object.defineProperty(client, method, {
			value: (input?: ControlInput<ControlMethod>) => client.call(method as ControlMethod, input as never),
			writable: false,
			enumerable: false,
			configurable: false,
		})
	}
}

function createControlMethodsProxy(client: EditorctlClientBase): EditorctlClient {
	const cachedMethods = new Map<string, (input?: ControlInput<ControlMethod>) => Promise<ControlOutput<ControlMethod>>>()
	const proxyTarget = client as EditorctlClient

	return new Proxy(proxyTarget, {
		get(target, prop, receiver) {
			if (prop === 'then') {
				return undefined
			}

			if (typeof prop !== 'string') {
				return Reflect.get(target, prop, receiver)
			}

			if (prop in target) {
				return Reflect.get(target, prop, receiver)
			}

			if (!isControlMethod(prop)) {
				return undefined
			}

			const cached = cachedMethods.get(prop)
			if (cached) {
				return cached
			}

			const method = (input?: ControlInput<ControlMethod>) => target.call(prop, input as never)
			cachedMethods.set(prop, method)
			return method
		},
	})
}

/**
 * Creates a typed client for the Tekton Editor control RPC.
 *
 * @param options - Connection options or a discovered editor instance.
 * @returns A client instance for making RPC calls.
 * @throws TransportError when the transport fails.
 * @throws Error with `isRpcError` when the request fails at the JSON-RPC layer.
 *
 * @example
 * ```ts
 * import { createEditorctlClient, discoverEditors } from '@tekton/editorctl-client'
 *
 * const [editor] = await discoverEditors()
 *
 * // Pass editor directly:
 * const client = createEditorctlClient(editor)
 *
 * // Or pass options:
 * const client = createEditorctlClient({ port: editor.wsPort })
 * ```
 */
export function createEditorctlClient(options: EditorctlClientOptions | DiscoveredEditor): EditorctlClient {
	const normalizedOptions: EditorctlClientOptions = 'wsPort' in options ? { port: options.wsPort } : options
	const client = new EditorctlClientImpl(normalizedOptions)
	attachControlMethods(client)
	return createControlMethodsProxy(client)
}
