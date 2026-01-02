import type { ControlMethod, ControlOutput } from './contract'

export const CONTROL_RPC_REQUEST_CHANNEL = 'control:rpc-request'
export const CONTROL_RPC_RESPONSE_CHANNEL = 'control:rpc-response'

export type JsonRpcId = string | number

export type JsonRpcRequest<M extends ControlMethod = ControlMethod> = {
	jsonrpc: '2.0'
	id: JsonRpcId
	method: M
	params?: unknown
}

export type JsonRpcSuccess<M extends ControlMethod = ControlMethod> = {
	jsonrpc: '2.0'
	id: JsonRpcId
	result: ControlOutput<M>
}

export type JsonRpcError = {
	jsonrpc: '2.0'
	id: JsonRpcId | null
	error: {
		code: number
		message: string
		data?: unknown
	}
}

export type JsonRpcResponse<M extends ControlMethod = ControlMethod> = JsonRpcSuccess<M> | JsonRpcError

export type ControlIpc = {
	onRpcRequest: (handler: (request: JsonRpcRequest) => void) => () => void
	sendRpcResponse: (response: JsonRpcResponse) => void
}

export function createJsonRpcResult<M extends ControlMethod>(
	id: JsonRpcId,
	result: ControlOutput<M>
): JsonRpcSuccess<M> {
	return {
		jsonrpc: '2.0',
		id,
		result,
	}
}

export function createJsonRpcError(
	id: JsonRpcId | null,
	code: number,
	message: string,
	data?: unknown
): JsonRpcError {
	return {
		jsonrpc: '2.0',
		id,
		error: {
			code,
			message,
			data,
		},
	}
}
