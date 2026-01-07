import process from 'node:process'

export enum ExitCode {
	Validation = 1,
	Transport = 2,
	Rpc = 3,
	Unexpected = 99,
}

export type ErrorCode = 'validation_error' | 'transport_error' | 'rpc_error' | 'unexpected_error'

export type ValidationError = Error & {
	isValidationError: true
	details?: unknown
}

export function createValidationError(message: string, details?: unknown): ValidationError {
	const error = new Error(message) as ValidationError
	error.isValidationError = true
	if (details !== undefined) {
		error.details = details
	}
	return error
}

type JsonErrorPayload = {
	message: string
	code: ErrorCode
	details?: unknown
}

export function handleError(error: unknown): never {
	const { exitCode, payload } = serializeError(error)
	process.stderr.write(`${JSON.stringify({ error: payload }, null, 2)}\n`)
	process.exit(exitCode)
}

function serializeError(error: unknown): { exitCode: ExitCode; payload: JsonErrorPayload } {
	const message = error instanceof Error ? error.message : String(error)
	let exitCode = ExitCode.Unexpected
	let code: ErrorCode = 'unexpected_error'
	let details: unknown

	if (error && typeof error === 'object') {
		if ('isTransportError' in error && error.isTransportError) {
			exitCode = ExitCode.Transport
			code = 'transport_error'
		} else if ('isRpcError' in error && error.isRpcError) {
			exitCode = ExitCode.Rpc
			code = 'rpc_error'
		} else if ('isValidationError' in error && error.isValidationError) {
			exitCode = ExitCode.Validation
			code = 'validation_error'
			if ('details' in error) {
				details = (error as ValidationError).details
			}
		}
	}

	const payload: JsonErrorPayload = details === undefined ? { message, code } : { message, code, details }

	return { exitCode, payload }
}
