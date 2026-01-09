import WebSocket from 'ws'

export interface WsTransportOptions {
	port: number
	maxAttempts?: number
	retryDelay?: number
	/**
	 * Timeout (in milliseconds) to wait for a single request/response roundtrip.
	 *
	 * When exceeded, the websocket is closed and the request fails with {@link TransportError}.
	 *
	 * When omitted, no timeout is enforced (the request may wait indefinitely).
	 */
	timeoutMs?: number
}

export class TransportError extends Error {
	readonly isTransportError = true

	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'TransportError'
	}
}

export class WsTransport {
	constructor(private options: WsTransportOptions) {}

	async send(payload: string): Promise<string> {
		const maxAttempts = this.options.maxAttempts ?? 3
		const initialRetryDelay = this.options.retryDelay ?? 100

		let lastError: Error | undefined

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return await this.trySend(payload)
			} catch (err) {
				lastError = err as Error
				if (attempt < maxAttempts) {
					const delay = initialRetryDelay * Math.pow(2, attempt - 1)
					await new Promise((resolve) => setTimeout(resolve, delay))
				}
			}
		}

		throw lastError ?? new Error('Failed to send payload after multiple attempts')
	}

	private trySend(payload: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://127.0.0.1:${this.options.port}`)
			let settled = false

			const timeoutMs = this.options.timeoutMs
			const timeout =
				typeof timeoutMs === 'number'
					? setTimeout(() => {
							finishReject(new TransportError(`Request timed out after ${timeoutMs}ms`))
						}, timeoutMs)
					: null

			const finishResolve = (value: string) => {
				if (settled) return
				settled = true
				if (timeout) clearTimeout(timeout)
				resolve(value)
				ws.close()
			}

			const finishReject = (error: Error) => {
				if (settled) return
				settled = true
				if (timeout) clearTimeout(timeout)
				reject(error)
				ws.close()
			}

			ws.on('open', () => {
				ws.send(payload)
			})

			ws.on('message', (data) => {
				finishResolve(data.toString())
			})

			ws.on('error', (err) => {
				finishReject(new TransportError(`Connection error: ${err.message}`, { cause: err }))
			})

			ws.on('close', (code, reason) => {
				if (settled) return
				const details = reason?.toString() ? ` (${reason.toString()})` : ''
				finishReject(new TransportError(`Connection closed before response (code ${code})${details}`))
			})
		})
	}
}
