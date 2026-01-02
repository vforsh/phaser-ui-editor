import { useEffect } from 'react'
import { match } from 'ts-pattern'
import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'
import { controlContract, isControlMethod, type ControlInput, type ControlMethod } from './contract'
import { createJsonRpcError, createJsonRpcResult, JsonRpcRequest, JsonRpcResponse } from './rpc'

/**
 * Installs a renderer-side bridge for the external control RPC.
 *
 * In development, listens for JSON-RPC requests coming from `window.controlIpc`, handles them
 * via `EditorControlService`, and forwards the resulting JSON-RPC response back to the main
 * process through the same IPC bridge.
 *
 * No-op outside dev mode or when the preload bridge is not available.
 */
export function useControlRpcBridge(appCommands: AppCommandsEmitter): void {
	useEffect(() => {
		if (!import.meta.env.DEV) {
			return
		}

		const controlIpc = window.controlIpc
		if (!controlIpc) {
			return
		}

		const service = new EditorControlService(appCommands)
		const unsubscribe = controlIpc.onRpcRequest(async (request: JsonRpcRequest) => {
			const response = await handleRpcRequest(service, request)
			controlIpc.sendRpcResponse(response)
		})

		return () => unsubscribe()
	}, [appCommands])
}

function handleRpcRequest(service: EditorControlService, request: JsonRpcRequest): Promise<JsonRpcResponse> {
	if (!isRecord(request)) {
		return Promise.resolve(createJsonRpcError(null, 400, 'invalid json-rpc request'))
	}

	const { id, jsonrpc, method, params } = request
	if (jsonrpc !== '2.0' || !isValidId(id) || typeof method !== 'string') {
		return Promise.resolve(createJsonRpcError(isValidId(id) ? id : null, 400, 'invalid json-rpc request'))
	}

	if (!isControlMethod(method)) {
		return Promise.resolve(createJsonRpcError(id, 404, `unknown method '${method}'`))
	}

	const parsedParams = controlContract[method].input.safeParse(params ?? {})
	if (!parsedParams.success) {
		return Promise.resolve(createJsonRpcError(id, 400, 'invalid params', parsedParams.error.flatten()))
	}

	const input = parsedParams.data as ControlInput<ControlMethod>

	const run = async (): Promise<JsonRpcResponse> => {
		const result = await match(method)
			.with('open-project', async () => {
				await service.openProject(input as ControlInput<'open-project'>)
				return { success: true }
			})
			.with('open-prefab', async () => {
				await service.openPrefab(input as ControlInput<'open-prefab'>)
				return { success: true }
			})
			.with('list-hierarchy', async () => service.listHierarchy())
			.with('select-object', async () => {
				await service.selectObject(input as ControlInput<'select-object'>)
				return { success: true }
			})
			.with('switch-to-context', async () => {
				await service.switchToContext(input as ControlInput<'switch-to-context'>)
				return { success: true }
			})
			.with('delete-objects', async () => {
				await service.deleteObjects(input as ControlInput<'delete-objects'>)
				return { success: true }
			})
			.exhaustive()

		const parsedOutput = controlContract[method].output.safeParse(result)
		if (!parsedOutput.success) {
			return createJsonRpcError(id, 500, 'invalid rpc response', parsedOutput.error.flatten())
		}

		return createJsonRpcResult(id, parsedOutput.data)
	}

	return run().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : 'internal error'
		return createJsonRpcError(id, 500, message)
	})
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isValidId(id: unknown): id is string | number {
	return typeof id === 'string' || typeof id === 'number'
}
