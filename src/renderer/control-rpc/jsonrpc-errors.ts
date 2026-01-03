/**
 * Standard JSON-RPC 2.0 error codes.
 *
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const JSONRPC_PARSE_ERROR = -32700
export const JSONRPC_INVALID_REQUEST = -32600
export const JSONRPC_METHOD_NOT_FOUND = -32601
export const JSONRPC_INVALID_PARAMS = -32602
export const JSONRPC_INTERNAL_ERROR = -32603

/**
 * App-specific operational error codes (reserved range -32000..-32099).
 */
export const ERR_NO_RENDERER_WINDOW = -32001
export const ERR_RENDERER_TIMEOUT = -32002
export const ERR_INVALID_RPC_RESPONSE = -32003
export const ERR_BUSY = -32004

export type JsonRpcErrorData =
	| { kind: 'zod'; issues: unknown; traceId: string }
	| { kind: 'operational'; reason: string; traceId: string; details?: unknown }
	| { kind: 'exception'; traceId: string; message?: string; stack?: string }
