import { BrowserWindow, ipcMain } from 'electron'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import {
	CONTROL_RPC_REQUEST_CHANNEL,
	CONTROL_RPC_RESPONSE_CHANNEL,
	JsonRpcRequest,
	JsonRpcResponse,
	createJsonRpcError,
} from '../../control-rpc/rpc'
import { controlContract, isControlMethod, type ControlMethod } from '../../control-rpc/contract'

type PendingRequest = {
	ws: WebSocket
	windowId: number
}

type RpcRouterOptions = {
	port: number
}

/**
 * JSON-RPC bridge that accepts external WebSocket clients and forwards requests to the renderer
 * via Electron IPC, then relays the renderer response back to the originating socket.
 *
 * Internally it keeps a `pending` map keyed by JSON-RPC `id` so responses can be routed back to
 * the correct WebSocket connection.
 */
export class ControlRpcServer {
	private server: WebSocketServer | null = null
	private readonly pending = new Map<string, PendingRequest>()
	private readonly windowRequests = new Map<number, Set<string>>()

	/**
	 * @param options - Runtime options (currently only port binding).
	 */
	constructor(private readonly options: RpcRouterOptions) {}

	/**
	 * Starts the WebSocket server and begins listening for renderer responses over IPC.
	 *
	 * No-op if already started.
	 */
	start(): void {
		if (this.server) {
			return
		}

		this.server = new WebSocketServer({ host: '127.0.0.1', port: this.options.port })
		this.server.on('connection', (ws) => this.handleConnection(ws))
		ipcMain.on(CONTROL_RPC_RESPONSE_CHANNEL, this.handleRendererResponse)
	}

	/**
	 * Stops the server, removes IPC listeners, and clears any tracked pending requests.
	 *
	 * No-op if not started.
	 */
	stop(): void {
		if (!this.server) {
			return
		}

		ipcMain.removeListener(CONTROL_RPC_RESPONSE_CHANNEL, this.handleRendererResponse)
		this.server.close()
		this.server = null
		this.pending.clear()
		this.windowRequests.clear()
	}

	/**
	 * Wires event handlers for a newly connected client socket.
	 */
	private handleConnection(ws: WebSocket): void {
		ws.on('message', (data) => {
			this.handleMessage(ws, data)
		})

		ws.on('close', () => {
			this.cleanupSocket(ws)
		})
	}

	/**
	 * Handles a single incoming client message:
	 * - Parses JSON
	 * - Validates JSON-RPC request shape
	 * - Locates a target renderer window
	 * - Forwards the request to renderer over IPC
	 *
	 * Error responses are sent as JSON-RPC errors:
	 * - 400: invalid json / invalid json-rpc request
	 * - 503: no renderer window available
	 */
	private handleMessage(ws: WebSocket, data: RawData): void {
		let parsed: unknown
		try {
			parsed = JSON.parse(data.toString())
		} catch {
			this.sendJson(ws, createJsonRpcError(null, 400, 'invalid json'))
			return
		}

		if (!isRecord(parsed)) {
			this.sendJson(ws, createJsonRpcError(null, 400, 'invalid json-rpc request'))
			return
		}

		const { id, jsonrpc, method, params } = parsed
		if (jsonrpc !== '2.0' || !isValidId(id) || typeof method !== 'string') {
			this.sendJson(ws, createJsonRpcError(isValidId(id) ? id : null, 400, 'invalid json-rpc request'))
			return
		}

		if (!isControlMethod(method)) {
			this.sendJson(ws, createJsonRpcError(id, 404, `unknown method '${method}'`))
			return
		}

		const parsedParams = controlContract[method].input.safeParse(params ?? {})
		if (!parsedParams.success) {
			this.sendJson(ws, createJsonRpcError(id, 400, 'invalid params', parsedParams.error.flatten()))
			return
		}

		const request: JsonRpcRequest<ControlMethod> = {
			jsonrpc: '2.0',
			id,
			method,
			params: parsedParams.data,
		}
		const targetWindow = BrowserWindow.getAllWindows()[0]
		if (!targetWindow || targetWindow.isDestroyed()) {
			this.sendJson(ws, createJsonRpcError(request.id, 503, 'no renderer window available'))
			return
		}

		this.trackRequest(request.id, ws, targetWindow.id)
		targetWindow.webContents.send(CONTROL_RPC_REQUEST_CHANNEL, request)
	}

	/**
	 * Receives a JSON-RPC response from the renderer and routes it back to the originating socket,
	 * based on the response `id`.
	 *
	 * Ignores notifications (responses without an `id`) and responses for unknown/expired ids.
	 */
	private handleRendererResponse = (_event: Electron.IpcMainEvent, response: JsonRpcResponse) => {
		const id = response?.id
		if (id === null || id === undefined) {
			return
		}

		const key = id.toString()
		const pending = this.pending.get(key)
		if (!pending) {
			return
		}

		this.pending.delete(key)
		const windowSet = this.windowRequests.get(pending.windowId)
		if (windowSet) {
			windowSet.delete(key)
			if (windowSet.size === 0) {
				this.windowRequests.delete(pending.windowId)
			}
		}

		this.sendJson(pending.ws, response)
	}

	/**
	 * Tracks a pending request so the corresponding renderer response can be routed back to the
	 * originating WebSocket connection.
	 */
	private trackRequest(id: string | number, ws: WebSocket, windowId: number): void {
		const key = id.toString()
		this.pending.set(key, { ws, windowId })
		const set = this.windowRequests.get(windowId) ?? new Set<string>()
		set.add(key)
		this.windowRequests.set(windowId, set)
	}

	/**
	 * Cleans up all pending requests that were initiated by a socket that has disconnected.
	 */
	private cleanupSocket(ws: WebSocket): void {
		for (const [key, pending] of this.pending) {
			if (pending.ws === ws) {
				this.pending.delete(key)
				const windowSet = this.windowRequests.get(pending.windowId)
				if (windowSet) {
					windowSet.delete(key)
					if (windowSet.size === 0) {
						this.windowRequests.delete(pending.windowId)
					}
				}
			}
		}
	}

	/**
	 * Sends a JSON payload to the socket if it's still open.
	 */
	private sendJson(ws: WebSocket, payload: JsonRpcResponse): void {
		if (ws.readyState !== ws.OPEN) {
			return
		}
		ws.send(JSON.stringify(payload))
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isValidId(id: unknown): id is string | number {
	return typeof id === 'string' || typeof id === 'number'
}
