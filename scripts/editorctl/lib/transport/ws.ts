import WebSocket from 'ws'

export interface WsTransportOptions {
	port: number
	maxAttempts?: number
	retryDelay?: number
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

			ws.on('open', () => {
				ws.send(payload)
			})

			ws.on('message', (data) => {
				resolve(data.toString())
				ws.close()
			})

			ws.on('error', (err) => {
				const transportError = new Error(`Connection error: ${err.message}`)
				// @ts-expect-error - attaching transport error flag
				transportError.isTransportError = true
				reject(transportError)
			})
		})
	}
}
