import process from 'node:process'

export enum ExitCode {
	Validation = 1,
	Transport = 2,
	Rpc = 3,
	Unexpected = 99,
}

export function handleError(error: unknown, isJsonMode: boolean): never {
	const message = error instanceof Error ? error.message : String(error)
	let code = ExitCode.Unexpected

	if (error && typeof error === 'object') {
		if ('isTransportError' in error && error.isTransportError) {
			code = ExitCode.Transport
		} else if ('isRpcError' in error && error.isRpcError) {
			code = ExitCode.Rpc
		} else if ('isValidationError' in error && error.isValidationError) {
			code = ExitCode.Validation
		}
	}

	if (isJsonMode) {
		process.stderr.write(JSON.stringify({ error: message, code }) + '\n')
	} else {
		process.stderr.write(`Error: ${message}\n`)
	}

	process.exit(code)
}
