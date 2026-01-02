import { useEffect } from 'react'
import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'
import { createJsonRpcError, createJsonRpcResult, isJsonRpcRequest, JsonRpcRequest, JsonRpcResponse } from './rpc'

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
	if (!isJsonRpcRequest(request)) {
		return Promise.resolve(createJsonRpcError(null, 400, 'invalid json-rpc request'))
	}

	const { id, method, params } = request

	const run = async (): Promise<JsonRpcResponse> => {
		switch (method) {
			case 'open-project':
				await service.openProject((params ?? {}) as never)
				return createJsonRpcResult(id, null)
			case 'open-prefab':
				await service.openPrefab((params ?? {}) as never)
				return createJsonRpcResult(id, null)
			case 'list-hierarchy':
				return createJsonRpcResult(id, await service.listHierarchy())
			case 'select-object':
				await service.selectObject((params ?? {}) as never)
				return createJsonRpcResult(id, null)
			case 'switch-to-context':
				await service.switchToContext((params ?? {}) as never)
				return createJsonRpcResult(id, null)
			case 'delete-objects':
				await service.deleteObjects((params ?? {}) as never)
				return createJsonRpcResult(id, null)
			default:
				return createJsonRpcError(id, 404, `unknown method '${method}'`)
		}
	}

	return run().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : 'internal error'
		return createJsonRpcError(id, 500, message)
	})
}
