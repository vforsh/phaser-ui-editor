export type ErrorStackPayload = {
	kind: string
	message: string
	stack?: string
}

export type ErrorStackReporter = {
	sendErrorStack: (payload: ErrorStackPayload) => void
}
