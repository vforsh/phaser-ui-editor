import type { ControlMethod } from '@tekton/control-rpc-contract'

/**
 * Represents an error returned by the Tekton Editor control RPC.
 */
export class RpcError extends Error {
	readonly isRpcError = true
	readonly code: number
	readonly data?: unknown
	readonly method: ControlMethod
	readonly port: number
	readonly instanceId?: string

	constructor(
		message: string,
		options: {
			code: number
			data?: unknown
			method: ControlMethod
			port: number
			instanceId?: string
			cause?: unknown
		},
	) {
		super(message, { cause: options.cause })
		this.name = 'RpcError'
		this.code = options.code
		this.data = options.data
		this.method = options.method
		this.port = options.port
		this.instanceId = options.instanceId
	}
}

/**
 * Type guard to check if an error is an {@link RpcError}.
 */
export function isRpcError(error: unknown): error is RpcError {
	return error instanceof RpcError || (error instanceof Error && (error as any).isRpcError === true)
}
