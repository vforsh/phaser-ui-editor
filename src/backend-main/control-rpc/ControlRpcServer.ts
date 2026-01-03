import { BrowserWindow, ipcMain } from 'electron'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import {
	CONTROL_RPC_REQUEST_CHANNEL,
	CONTROL_RPC_RESPONSE_CHANNEL,
	CONTROL_EDITOR_STATUS_CHANNEL,
	JsonRpcResponse,
	createJsonRpcError,
	createJsonRpcResult,
} from '../../control-rpc/rpc'
import { validateControlRequest } from '../../control-rpc/jsonrpc-validate'
import { editorRegistry } from './editor-registry'
import {
	ERR_NO_RENDERER_WINDOW,
	ERR_RENDERER_TIMEOUT,
	JSONRPC_PARSE_ERROR,
} from '../../control-rpc/jsonrpc-errors'
import { logger } from '../../logs/logs'

type PendingRequest = {
	ws: WebSocket
	windowId: number
	method: string
	timeout: NodeJS.Timeout
}

type RpcRouterOptions = {
	port: number
	timeoutMs?: number
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
	private readonly timeoutMs: number
	private readonly logger = logger.getOrCreate('control-rpc')

	/**
	 * @param options - Runtime options (currently only port binding).
	 */
	constructor(private readonly options: RpcRouterOptions) {
		this.timeoutMs = options.timeoutMs ?? 10000
	}

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
		ipcMain.on(CONTROL_EDITOR_STATUS_CHANNEL, this.handleEditorStatus)
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
		ipcMain.removeListener(CONTROL_EDITOR_STATUS_CHANNEL, this.handleEditorStatus)
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
	 * - -32700: parse error
	 * - -32600: invalid request
	 * - -32601: method not found
	 * - -32602: invalid params
	 * - -32001: no renderer window available
	 */
	private handleMessage(ws: WebSocket, data: RawData): void {
		let parsed: unknown
		try {
			parsed = JSON.parse(data.toString())
		} catch {
			this.sendJson(ws, createJsonRpcError(null, JSONRPC_PARSE_ERROR, 'parse error'))
			return
		}

		const validation = validateControlRequest(parsed)
		if (!validation.ok) {
			this.sendJson(ws, validation.response)
			return
		}

		const { request, traceId } = validation
		this.logger.info(this.formatLog(traceId, request.method, 'recv'))

		if (request.method === 'listEditors') {
			const editors = editorRegistry.getEditors()
			this.sendJson(ws, createJsonRpcResult(request.id, { editors }))
			this.logger.info(this.formatLog(traceId, request.method, 'reply', { ok: true }))
			return
		}

		const targetWindow = BrowserWindow.getAllWindows()[0]
		if (!targetWindow || targetWindow.isDestroyed()) {
			const errorResponse = createJsonRpcError(request.id, ERR_NO_RENDERER_WINDOW, 'no renderer window available', {
				kind: 'operational',
				reason: 'no_window',
				traceId,
			})
			this.sendJson(ws, errorResponse)
			this.logger.error(this.formatLog(traceId, request.method, 'error', { code: ERR_NO_RENDERER_WINDOW }))
			return
		}

		this.trackRequest(request.id, request.method, ws, targetWindow.id)
		this.logger.info(this.formatLog(traceId, request.method, 'forward', { windowId: targetWindow.id }))
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

		clearTimeout(pending.timeout)
		this.pending.delete(key)
		const windowSet = this.windowRequests.get(pending.windowId)
		if (windowSet) {
			windowSet.delete(key)
			if (windowSet.size === 0) {
				this.windowRequests.delete(pending.windowId)
			}
		}

		const traceId = key
		const ok = !('error' in response)
		this.logger.info(this.formatLog(traceId, pending.method, 'reply', { ok }))

		this.sendJson(pending.ws, response)
	}

	private handleEditorStatus = (event: Electron.IpcMainEvent, status: { projectPath: string | null }) => {
		const window = BrowserWindow.fromWebContents(event.sender)
		if (window) {
			editorRegistry.setProjectPath(window.id, status.projectPath)
		}
	}

	/**
	 * Tracks a pending request so the corresponding renderer response can be routed back to the
	 * originating WebSocket connection.
	 */
	private trackRequest(id: string | number, method: string, ws: WebSocket, windowId: number): void {
		const key = id.toString()
		const timeout = setTimeout(() => {
			this.handleTimeout(key)
		}, this.timeoutMs)

		this.pending.set(key, { ws, windowId, method, timeout })
		const set = this.windowRequests.get(windowId) ?? new Set<string>()
		set.add(key)
		this.windowRequests.set(windowId, set)
	}

	private handleTimeout(id: string): void {
		const pending = this.pending.get(id)
		if (!pending) {
			return
		}

		this.pending.delete(id)
		const windowSet = this.windowRequests.get(pending.windowId)
		if (windowSet) {
			windowSet.delete(id)
		}

		this.logger.info(this.formatLog(id, pending.method, 'timeout', { timeoutMs: this.timeoutMs }))

		this.sendJson(
			pending.ws,
			createJsonRpcError(id, ERR_RENDERER_TIMEOUT, 'renderer timeout', {
				kind: 'operational',
				reason: 'timeout',
				traceId: id,
			})
		)
	}

	private formatLog(traceId: string, method: string, phase: string, rest?: unknown): string {
		const base = `#${traceId} - ${method} (${phase})`
		if (rest === undefined) {
			return `${base} <>`
		}

		const restStr = typeof rest === 'string' ? rest : JSON.stringify(rest)
		return `${base} <${restStr}>`
	}

	/**
	 * Cleans up all pending requests that were initiated by a socket that has disconnected.
	 */
	private cleanupSocket(ws: WebSocket): void {
		for (const [key, pending] of this.pending) {
			if (pending.ws === ws) {
				clearTimeout(pending.timeout)
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
