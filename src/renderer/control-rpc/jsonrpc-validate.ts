import { nanoid } from 'nanoid'
import { controlContract, isControlMethod, type ControlInput, type ControlMethod } from './api/ControlApi'
import { JSONRPC_INVALID_PARAMS, JSONRPC_INVALID_REQUEST, JSONRPC_METHOD_NOT_FOUND } from './jsonrpc-errors'
import { createJsonRpcError, type JsonRpcError, type JsonRpcId, type JsonRpcRequest } from './rpc'

export type ValidationResult<M extends ControlMethod = ControlMethod> =
	| {
			ok: true
			request: JsonRpcRequest<M>
			input: ControlInput<M>
			traceId: string
	  }
	| {
			ok: false
			response: JsonRpcError
			traceId: string
	  }

/**
 * Validates a JSON-RPC request envelope and its parameters against the control contract.
 *
 * This helper is shared between main and renderer processes to ensure consistent
 * error handling and parameter parsing.
 */
export function validateControlRequest(payload: unknown): ValidationResult {
	const traceId = getTraceId(payload)

	if (!isRecord(payload)) {
		return {
			ok: false,
			traceId,
			response: createJsonRpcError(null, JSONRPC_INVALID_REQUEST, 'invalid json-rpc request'),
		}
	}

	const { id, jsonrpc, method, params } = payload

	if (jsonrpc !== '2.0' || !isValidId(id) || typeof method !== 'string') {
		return {
			ok: false,
			traceId,
			response: createJsonRpcError(
				isValidId(id) ? id : null,
				JSONRPC_INVALID_REQUEST,
				'invalid json-rpc request'
			),
		}
	}

	if (!isControlMethod(method)) {
		return {
			ok: false,
			traceId,
			response: createJsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, `unknown method '${method}'`),
		}
	}

	const parsedParams = controlContract[method].input.safeParse(params ?? {})
	if (!parsedParams.success) {
		return {
			ok: false,
			traceId,
			response: createJsonRpcError(id, JSONRPC_INVALID_PARAMS, 'invalid params', {
				kind: 'zod',
				issues: parsedParams.error.flatten(),
				traceId,
			}),
		}
	}

	return {
		ok: true,
		traceId,
		input: parsedParams.data as ControlInput<ControlMethod>,
		request: {
			jsonrpc: '2.0',
			id,
			method,
			params: parsedParams.data,
		} as JsonRpcRequest<ControlMethod>,
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isValidId(id: unknown): id is JsonRpcId {
	return typeof id === 'string' || typeof id === 'number'
}

function getTraceId(payload: unknown): string {
	if (isRecord(payload) && isValidId(payload.id)) {
		return String(payload.id)
	}
	return nanoid(8)
}
