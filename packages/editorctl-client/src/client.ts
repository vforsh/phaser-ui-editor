import type { ControlInput, ControlMeta, ControlMetaMethod, ControlMethod, ControlOutput } from '@tekton/control-rpc-contract'

import { controlContract, isControlMethod } from '@tekton/control-rpc-contract'
import fs from 'node:fs'
import path from 'node:path'

import type { GeneratedControlMethods } from './__generated__/control-methods'
import type { DiscoveredEditor } from './discovery/discoverEditors'

import { RpcClient } from './rpc/client'
import { WsTransport } from './transport/ws'

/**
 * Connection options for {@link createClient}.
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
	/**
	 * Timeout (in milliseconds) to wait for a single request/call roundtrip.
	 * @defaultValue 30000
	 */
	timeoutMs?: number
	/**
	 * Unique identifier for the editor instance (used for richer errors).
	 */
	instanceId?: string
}

/**
 * Metadata options for {@link EditorctlClientBase.getMeta}.
 */
export interface GetMetaOptions {
	/**
	 * Whether to ignore the cache and fetch live metadata from the editor.
	 * @defaultValue false
	 */
	cache?: boolean
}

/**
 * Result of {@link EditorctlClientBase.openProjectIfNeeded}.
 */
export interface OpenProjectIfNeededResult {
	/**
	 * Whether a new project was opened.
	 */
	opened: boolean
	/**
	 * The canonical path of the opened project.
	 */
	projectPath: string
}

/**
 * Typed client for the Tekton Editor control RPC.
 */
export interface EditorctlClientBase {
	/**
	 * Calls a control RPC method with the provided JSON params.
	 *
	 * @param method - Control RPC method name.
	 * @param args - JSON params object. Required if the method has required params.
	 * @returns The method output payload.
	 * @throws TransportError when the transport fails.
	 * @throws RpcError when the request fails at the JSON-RPC layer.
	 *
	 * @example
	 * ```ts
	 * const result = await client.call('ping')
	 * ```
	 */
	call<M extends ControlMethod>(
		method: M,
		...args: ControlInput<M> extends Record<string, never> ? [] | [ControlInput<M>] : [ControlInput<M>]
	): Promise<ControlOutput<M>>
	/**
	 * Fetches control RPC discovery metadata from the running editor.
	 *
	 * Results are cached by default after the first call.
	 *
	 * @param options - Metadata options (e.g. disabling cache).
	 * @returns The discovery payload, including method list and JSON Schemas.
	 * @throws TransportError when the transport fails.
	 * @throws RpcError when the request fails at the JSON-RPC layer.
	 *
	 * @example
	 * ```ts
	 * const meta = await client.getMeta()
	 * console.log(meta.methods.map((entry) => entry.method))
	 * ```
	 */
	getMeta(options?: GetMetaOptions): Promise<ControlMeta>
	/**
	 * Forces a refresh of the cached control RPC discovery metadata.
	 *
	 * @returns The discovery payload, including method list and JSON Schemas.
	 * @throws TransportError when the transport fails.
	 * @throws RpcError when the request fails at the JSON-RPC layer.
	 */
	refreshMeta(): Promise<ControlMeta>
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
	/**
	 * Opens a project only if it's not already open.
	 *
	 * This method is idempotent and handles path normalization (including symlinks).
	 *
	 * @param input - Project opening params.
	 * @returns The result of the operation.
	 *
	 * @example
	 * ```ts
	 * await client.openProjectIfNeeded({ path: '~/my-project' })
	 * ```
	 */
	openProjectIfNeeded(input: { path: string }): Promise<OpenProjectIfNeededResult>
}

export interface EditorctlClient extends EditorctlClientBase, GeneratedControlMethods {}

class EditorctlClientImpl implements EditorctlClientBase {
	private rpc: RpcClient
	private metaPromise: Promise<ControlMeta> | null = null

	constructor(options: EditorctlClientOptions) {
		const timeoutMs = options.timeoutMs ?? 30000
		const transport = new WsTransport({
			port: options.port,
			maxAttempts: options.maxAttempts,
			retryDelay: options.retryDelay,
			timeoutMs,
		})
		this.rpc = new RpcClient(transport, {
			port: options.port,
			instanceId: (options as any).instanceId,
		})
	}

	async call<M extends ControlMethod>(
		method: M,
		...args: ControlInput<M> extends Record<string, never> ? [] | [ControlInput<M>] : [ControlInput<M>]
	): Promise<ControlOutput<M>> {
		const params = (args[0] ?? {}) as ControlInput<M>
		return this.rpc.request(method, params)
	}

	async getMeta(options: GetMetaOptions = {}): Promise<ControlMeta> {
		const useCache = options.cache ?? true

		if (useCache && this.metaPromise) {
			return this.metaPromise
		}

		const promise = this.rpc.request('getControlMeta', {} as ControlInput<'getControlMeta'>)

		if (useCache) {
			this.metaPromise = promise
		}

		return promise
	}

	async refreshMeta(): Promise<ControlMeta> {
		this.metaPromise = null
		return this.getMeta()
	}

	async schema<M extends ControlMethod>(
		method: M,
	): Promise<{
		method: M
		inputSchema: ControlMetaMethod['inputSchema']
		outputSchema: ControlMetaMethod['outputSchema']
	}> {
		const meta = await this.getMeta()
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

	async openProjectIfNeeded(input: { path: string }): Promise<OpenProjectIfNeededResult> {
		const requestedPath = await normalizePath(input.path)

		try {
			const projectInfo = await this.call('getProjectInfo')
			const currentPath = await normalizePath(projectInfo.path)

			if (requestedPath === currentPath) {
				return { opened: false, projectPath: projectInfo.path }
			}
		} catch {
			// Ignore error and proceed to open (e.g. no project open)
		}

		await this.call('openProject', { path: input.path })

		// Try to get canonical path after opening
		try {
			const projectInfo = await this.call('getProjectInfo')
			return { opened: true, projectPath: projectInfo.path }
		} catch {
			return { opened: true, projectPath: input.path }
		}
	}
}

async function normalizePath(p: string): Promise<string> {
	try {
		return await fs.promises.realpath(p)
	} catch {
		return path.resolve(p)
	}
}

const reservedMethodNames = new Set(['call', 'getMeta', 'refreshMeta', 'schema', 'openProjectIfNeeded'])

/**
 * Attaches control RPC methods from the contract directly to the client instance.
 *
 * This provides a deterministic set of methods based on the build-time contract,
 * supporting IDE autocompletion and direct property access.
 *
 * @param client - The client instance to attach methods to.
 */
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

/**
 * Wraps the client in a Proxy to provide dynamic access to control RPC methods.
 *
 * This serves as a fallback for forward-compatibility, allowing the client to
 * call new methods added to the editor even if they aren't yet in the build-time contract.
 * Functions are memoized per method name to maintain stable references.
 *
 * @param client - The base client instance to wrap.
 * @returns A proxied client instance with dynamic method support.
 */
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

			const method = (input?: ControlInput<ControlMethod>) => target.call(prop as never, input as never)
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
 * @throws RpcError when the request fails at the JSON-RPC layer.
 *
 * @example
 * ```ts
 * import { createClient, discoverEditors } from '@tekton/editorctl-client'
 *
 * const [editor] = await discoverEditors()
 *
 * // Pass editor directly:
 * const client = createClient(editor)
 *
 * // Or pass options:
 * const client = createClient({ port: editor.wsPort })
 * ```
 */
export function createClient(options: EditorctlClientOptions | DiscoveredEditor): EditorctlClient {
	const normalizedOptions: EditorctlClientOptions =
		'wsPort' in options ? { ...options, port: options.wsPort, instanceId: options.instanceId } : options
	const client = new EditorctlClientImpl(normalizedOptions)
	attachControlMethods(client)
	return createControlMethodsProxy(client)
}
