import type { ControlInput } from '@tekton/control-rpc-contract'

import { APP_ID, instanceRecordSchema, type InstanceRecord } from '@tekton/control-rpc-contract'
import WebSocket from 'ws'

import type { JsonRpcRequest, JsonRpcResponse } from '../rpc/types'

import { generateId } from '../rpc/id'

/**
 * Options for pinging a running Tekton Editor instance over the control websocket.
 */
export type PingOptions = {
	/**
	 * Control websocket port to connect to (typically discovered from the registry).
	 */
	port: number
	/**
	 * Timeout (in milliseconds) to wait for a `ping` response before rejecting.
	 */
	timeoutMs: number
}

/**
 * Validates that a websocket endpoint is a Tekton Editor control RPC server by calling JSON-RPC `ping`.
 *
 * The promise resolves with the instance record returned from the editor.
 *
 * @param options - Connection options (port + timeout).
 * @returns The instance record returned by the editor.
 * @throws If the connection fails, times out, returns an error, or fails schema validation.
 */
export function pingEditor(options: PingOptions): Promise<InstanceRecord> {
	return new Promise((resolve, reject) => {
		const requestId = generateId()
		const ws = new WebSocket(`ws://127.0.0.1:${options.port}`)
		let settled = false

		const timeout = setTimeout(() => {
			finishReject(new Error(`Ping timed out after ${options.timeoutMs}ms`))
		}, options.timeoutMs)

		const finishResolve = (value: InstanceRecord) => {
			if (settled) return
			settled = true
			clearTimeout(timeout)
			resolve(value)
			ws.close()
		}

		const finishReject = (error: Error) => {
			if (settled) return
			settled = true
			clearTimeout(timeout)
			reject(error)
			ws.close()
		}

		ws.on('open', () => {
			const request: JsonRpcRequest<'ping'> = {
				jsonrpc: '2.0',
				id: requestId,
				method: 'ping',
				params: {} as ControlInput<'ping'>,
			}
			ws.send(JSON.stringify(request))
		})

		ws.on('message', (data) => {
			let parsed: JsonRpcResponse<'ping'>
			try {
				parsed = JSON.parse(data.toString()) as JsonRpcResponse<'ping'>
			} catch (error) {
				finishReject(new Error('Invalid JSON-RPC response'))
				return
			}

			if (parsed.id !== requestId) {
				return
			}

			if (parsed.error) {
				finishReject(new Error(parsed.error.message || 'RPC error'))
				return
			}

			const result = instanceRecordSchema.safeParse(parsed.result)
			if (!result.success) {
				finishReject(new Error('Ping response failed schema validation'))
				return
			}

			if (result.data.appId !== APP_ID) {
				finishReject(new Error('Ping response was not from a Tekton Editor instance'))
				return
			}

			finishResolve(result.data)
		})

		ws.on('error', (err) => {
			finishReject(new Error(`Connection error: ${err.message}`))
		})

		ws.on('close', (code, reason) => {
			if (settled) return
			const details = reason?.toString() ? ` (${reason.toString()})` : ''
			finishReject(new Error(`Connection closed before response (code ${code})${details}`))
		})
	})
}
