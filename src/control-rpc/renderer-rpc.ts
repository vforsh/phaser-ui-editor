import { useEffect, useMemo } from 'react'
import { match } from 'ts-pattern'
import type { AppCommandsEmitter } from '../AppCommands'
import { EditorControlService } from './EditorControlService'
import { controlContract, type ControlInput } from './contract'
import { createJsonRpcError, createJsonRpcResult, JsonRpcRequest, JsonRpcResponse } from './rpc'
import { validateControlRequest } from './jsonrpc-validate'
import { ERR_INVALID_RPC_RESPONSE, JSONRPC_INTERNAL_ERROR } from './jsonrpc-errors'
import { RpcScheduler } from './rpc-scheduler'
import { logger } from '../logs/logs'
import { state, subscribe } from '../state/State'

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
	const scheduler = useMemo(() => new RpcScheduler(), [])

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return
		}

		const controlIpc = window.controlIpc
		if (!controlIpc) {
			return
		}

		const service = new EditorControlService(appCommands)

		// Hardening: push current status and watch for changes
		controlIpc.sendEditorStatus({ projectPath: state.projectDir })
		const unsubscribeStatus = subscribe(state, (ops) => {
			const isProjectDirChanged = ops.some((op) => op[1].length === 1 && op[1][0] === 'projectDir')
			if (isProjectDirChanged) {
				controlIpc.sendEditorStatus({ projectPath: state.projectDir })
			}
		})

		const unsubscribe = controlIpc.onRpcRequest(async (request: JsonRpcRequest) => {
			const response = await handleRpcRequest(service, scheduler, request)
			controlIpc.sendRpcResponse(response)
		})

		return () => {
			unsubscribeStatus()
			unsubscribe()
		}
	}, [appCommands, scheduler])
}

function handleRpcRequest(
	service: EditorControlService,
	scheduler: RpcScheduler,
	request: JsonRpcRequest
): Promise<JsonRpcResponse> {
	const rpcLogger = logger.getOrCreate('control-rpc')

	const validation = validateControlRequest(request)
	if (!validation.ok) {
		rpcLogger.error('validation failed', validation.response)
		return Promise.resolve(validation.response)
	}

	const { id, method } = validation.request
	const { input, traceId } = validation

	rpcLogger.info({ traceId, method, phase: 'recv' })

	const run = async (): Promise<JsonRpcResponse> => {
		const start = Date.now()
		rpcLogger.info({ traceId, method, phase: 'exec-start' })

		const result = await scheduler.schedule(method, async () =>
			match(method)
				.with('open-project', (_m) => service.openProject(input as ControlInput<typeof _m>))
				.with('open-prefab', (_m) => service.openPrefab(input as ControlInput<typeof _m>))
				.with('list-hierarchy', () => service.listHierarchy())
				.with('select-object', (_m) => service.selectObject(input as ControlInput<typeof _m>))
				.with('switch-to-context', (_m) => service.switchToContext(input as ControlInput<typeof _m>))
				.with('delete-objects', (_m) => service.deleteObjects(input as ControlInput<typeof _m>))
				.with('list-editors', () => service.listEditors())
				.exhaustive()
		)

		const durationMs = Date.now() - start
		rpcLogger.info({ traceId, method, phase: 'exec-end', durationMs, ok: true })

		const parsedOutput = controlContract[method].output.safeParse(result)
		if (!parsedOutput.success) {
			const errorResponse = createJsonRpcError(id, ERR_INVALID_RPC_RESPONSE, 'invalid rpc response', {
				kind: 'zod',
				issues: parsedOutput.error.flatten(),
				traceId,
			})
			rpcLogger.error({ traceId, method, phase: 'error', code: ERR_INVALID_RPC_RESPONSE })
			return errorResponse
		}

		return createJsonRpcResult(id, parsedOutput.data)
	}

	return run().catch((error: unknown) => {
		const message = error instanceof Error ? error.message : 'internal error'
		const errorResponse = createJsonRpcError(id, JSONRPC_INTERNAL_ERROR, message, {
			kind: 'exception',
			traceId,
			stack: error instanceof Error ? error.stack : undefined,
		})
		rpcLogger.error({ traceId, method, phase: 'error', code: JSONRPC_INTERNAL_ERROR, message })
		return errorResponse
	})
}
