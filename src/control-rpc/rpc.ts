export const CONTROL_RPC_REQUEST_CHANNEL = 'control:rpc-request'
export const CONTROL_RPC_RESPONSE_CHANNEL = 'control:rpc-response'

export const RPC_METHODS = [
	'open-project',
	'open-prefab',
	'list-hierarchy',
	'select-object',
	'switch-to-context',
	'delete-objects',
] as const

export type RpcMethod = (typeof RPC_METHODS)[number]

export type JsonRpcId = string | number

export type JsonRpcRequest = {
	jsonrpc: '2.0'
	id: JsonRpcId
	method: RpcMethod
	params?: unknown
}

export type JsonRpcSuccess = {
	jsonrpc: '2.0'
	id: JsonRpcId
	result: unknown
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

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError

export type HierarchyNode = {
	id: string
	name: string
	type: string
	children?: HierarchyNode[]
}

export type OpenPrefabParams = { assetId?: string; path?: string }
export type OpenProjectParams = { path: string }
export type IdOrPathParams = { id?: string; path?: string }
export type DeleteObjectsParams = { ids: string[] }

export type ControlIpc = {
	onRpcRequest: (handler: (request: JsonRpcRequest) => void) => () => void
	sendRpcResponse: (response: JsonRpcResponse) => void
}

type RecordValue = Record<string, unknown>

export function isRpcMethod(value: unknown): value is RpcMethod {
	return typeof value === 'string' && (RPC_METHODS as readonly string[]).includes(value)
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
	if (!isRecord(value)) {
		return false
	}

	if (value.jsonrpc !== '2.0') {
		return false
	}

	if (typeof value.id !== 'string' && typeof value.id !== 'number') {
		return false
	}

	if (!isRpcMethod(value.method)) {
		return false
	}

	return true
}

export function createJsonRpcResult(id: JsonRpcId, result: unknown): JsonRpcSuccess {
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

function isRecord(value: unknown): value is RecordValue {
	return typeof value === 'object' && value !== null
}
