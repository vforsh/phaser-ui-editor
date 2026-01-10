import { controlContract, type ControlInput, type ControlMethod, type ControlOutput } from '@tekton/control-rpc-contract'
import { useEffect, useMemo } from 'react'

import type { AppCommandsEmitter } from '../AppCommands'

import { logger } from '../logs/logs'
import { state, subscribe } from '../state/State'
import { UrlParams } from '../url-params/UrlParams'
import { ControlOperationalError } from './control-errors'
import { ERR_INVALID_RPC_RESPONSE, JSONRPC_INTERNAL_ERROR } from './jsonrpc-errors'
import { validateControlRequest } from './jsonrpc-validate'
import { createJsonRpcError, createJsonRpcResult, JsonRpcRequest, JsonRpcResponse } from './rpc'
import { RpcScheduler } from './rpc-scheduler'
import { EditorControlService } from './service/EditorControlService'

/**
 * Installs a renderer-side bridge for the external control RPC.
 *
 * Listens for JSON-RPC requests coming from `window.controlIpc`, handles them
 * via `EditorControlService`, and forwards the resulting JSON-RPC response
 * back to the main process through the same IPC bridge.
 *
 * Enabled unless running in E2E mode.
 */
export function useControlRpcBridge(appCommands: AppCommandsEmitter): void {
	const scheduler = useMemo(() => new RpcScheduler(), [])

	useEffect(() => {
		const isE2E = UrlParams.getBool('e2e')
		if (isE2E) {
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

function handleRpcRequest(service: EditorControlService, scheduler: RpcScheduler, request: JsonRpcRequest): Promise<JsonRpcResponse> {
	const rpcLogger = logger.getOrCreate('control-rpc')

	const validation = validateControlRequest(request)
	if (!validation.ok) {
		rpcLogger.error(`${validation.traceId} # ${request.method} validation-failed`, validation.response)
		return Promise.resolve(validation.response)
	}

	const { id, method } = validation.request
	const { input, traceId } = validation

	rpcLogger.info(`${traceId} # ${method} recv`, { params: request.params })

	const run = async (): Promise<JsonRpcResponse> => {
		const start = Date.now()

		rpcLogger.info(`${traceId} # ${method} exec-start`, { params: request.params })

		const result = await scheduler.schedule(method, async () => callHandler(service, method, input))

		const durationMs = Date.now() - start
		rpcLogger.info(`${traceId} # ${method} exec-end durationMs=${durationMs} ok=true`, { result })

		const parsedOutput = controlContract[method].output.safeParse(result)
		if (!parsedOutput.success) {
			const errorResponse = createJsonRpcError(id, ERR_INVALID_RPC_RESPONSE, 'invalid rpc response', {
				kind: 'zod',
				issues: parsedOutput.error.flatten(),
				traceId,
			})
			rpcLogger.error(`${traceId} # ${method} error code=${ERR_INVALID_RPC_RESPONSE}`, {})
			return errorResponse
		}

		return createJsonRpcResult(id, parsedOutput.data)
	}

	return run().catch((error: unknown) => {
		if (error instanceof ControlOperationalError) {
			const errorResponse = createJsonRpcError(id, error.code, error.message, {
				kind: 'operational',
				reason: error.reason,
				traceId,
				details: error.details,
			})
			rpcLogger.error(`${traceId} # ${method} error code=${error.code} message=${error.message}`, {})
			return errorResponse
		}

		const message = error instanceof Error ? error.message : 'internal error'
		const errorResponse = createJsonRpcError(id, JSONRPC_INTERNAL_ERROR, message, {
			kind: 'exception',
			traceId,
			stack: error instanceof Error ? error.stack : undefined,
		})
		rpcLogger.error(`${traceId} # ${method} error code=${JSONRPC_INTERNAL_ERROR} message=${message}`, {})
		return errorResponse
	})
}

function callHandler<M extends ControlMethod>(service: EditorControlService, method: M, input: ControlInput<M>): Promise<ControlOutput<M>> {
	return service.handlers[method](input)
}
