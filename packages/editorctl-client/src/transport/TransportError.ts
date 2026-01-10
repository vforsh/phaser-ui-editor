import type { ControlMethod } from '@tekton/control-rpc-contract'

export class TransportError extends Error {
	readonly isTransportError = true
	readonly port?: number
	readonly method?: ControlMethod
	readonly instanceId?: string

	constructor(message: string, options?: { cause?: unknown; port?: number; method?: ControlMethod; instanceId?: string }) {
		super(message, options)
		this.name = 'TransportError'
		this.port = options?.port
		this.method = options?.method
		this.instanceId = options?.instanceId
	}
}

/**
 * Type guard to check if an error is a {@link TransportError}.
 */
export function isTransportError(error: unknown): error is TransportError {
	return error instanceof TransportError || (error instanceof Error && (error as any).isTransportError === true)
}
