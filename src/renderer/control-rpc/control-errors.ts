type ControlOperationalErrorOptions = {
	code: number
	reason: string
	message: string
	details?: unknown
}

export class ControlOperationalError extends Error {
	readonly code: number
	readonly reason: string
	readonly details?: unknown

	constructor({ code, reason, message, details }: ControlOperationalErrorOptions) {
		super(message)
		this.name = 'ControlOperationalError'
		this.code = code
		this.reason = reason
		this.details = details
	}
}
