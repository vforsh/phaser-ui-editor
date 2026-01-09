import { TransportError } from './transport/ws'

/**
 * Represents an error returned by the Tekton Editor control RPC.
 */
export interface RpcError extends Error {
	/**
	 * Identifier for RPC-level failures.
	 */
	isRpcError: true
	/**
	 * JSON-RPC error code.
	 */
	code?: number
	/**
	 * Additional error data from the server.
	 */
	data?: unknown
}

/**
 * Type guard to check if an error is a {@link TransportError}.
 */
export function isTransportError(error: unknown): error is TransportError {
	return error instanceof TransportError || (error instanceof Error && (error as any).isTransportError === true)
}

/**
 * Type guard to check if an error is an {@link RpcError}.
 */
export function isRpcError(error: unknown): error is RpcError {
	return error instanceof Error && (error as any).isRpcError === true
}
