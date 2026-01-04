import type { ErrorStackReporter } from '../../shared/ipc/errorStackReporterTypes'

declare global {
	interface Window {
		errorStackReporter?: ErrorStackReporter
		__rendererErrorStackForwarderForHmr?: RendererErrorStackForwarder | null
	}
}

type RendererErrorStackPayload = {
	kind: 'window.error' | 'window.unhandledrejection' | 'console.error'
	message: string
	stack?: string
}

export class RendererErrorStackForwarder {
	private readonly dedupeMs: number
	private readonly lastSentAtByKey = new Map<string, number>()
	private api: Window['errorStackReporter'] | null = null
	private originalConsoleError: ((...args: unknown[]) => void) | null = null
	private isInstalled = false

	constructor(options?: { dedupeMs?: number }) {
		this.dedupeMs = options?.dedupeMs ?? 1000
	}

	public install(): void {
		if (this.isInstalled) {
			return
		}

		if (!import.meta.env.DEV) {
			return
		}

		const api = window.errorStackReporter
		if (!api) {
			return
		}

		this.api = api
		this.isInstalled = true

		window.addEventListener('error', this.onWindowError, { capture: true })
		window.addEventListener('unhandledrejection', this.onUnhandledRejection, { capture: true })

		this.originalConsoleError = console.error.bind(console)
		console.error = (...args: unknown[]) => {
			const error = args.find((a) => a instanceof Error) as Error | undefined
			if (error) {
				this.send({
					kind: 'console.error',
					message: stringifyConsoleArgs(args),
					stack: error.stack,
				})
			}
			return this.originalConsoleError!(...args)
		}
	}

	private readonly onWindowError = (event: Event) => {
		const e = event as ErrorEvent
		const message = typeof e.message === 'string' && e.message ? e.message : 'Uncaught error'
		const stack =
			(e.error instanceof Error ? e.error.stack : undefined) ??
			(e.filename ? `${e.filename}:${e.lineno ?? 0}:${e.colno ?? 0}` : undefined)

		this.send({ kind: 'window.error', message, stack })
	}

	private readonly onUnhandledRejection = (event: Event) => {
		const reason = (event as PromiseRejectionEvent).reason
		if (reason == null) {
			this.send({ kind: 'window.unhandledrejection', message: 'Unhandled promise rejection (no reason)' })
			return
		}

		if (reason instanceof Error) {
			this.send({
				kind: 'window.unhandledrejection',
				message: `${reason.name}: ${reason.message}`,
				stack: reason.stack,
			})
			return
		}

		this.send({
			kind: 'window.unhandledrejection',
			message: typeof reason === 'string' ? reason : safeStringify(reason),
		})
	}

	public dispose(): void {
		if (!this.isInstalled) {
			return
		}

		this.isInstalled = false
		this.api = null
		this.lastSentAtByKey.clear()

		window.removeEventListener('error', this.onWindowError, { capture: true } as AddEventListenerOptions)
		window.removeEventListener('unhandledrejection', this.onUnhandledRejection, { capture: true } as AddEventListenerOptions)

		if (this.originalConsoleError) {
			console.error = this.originalConsoleError
		}
		this.originalConsoleError = null
	}

	private shouldSend(key: string): boolean {
		const now = Date.now()
		const last = this.lastSentAtByKey.get(key) ?? 0
		if (now - last < this.dedupeMs) {
			return false
		}
		this.lastSentAtByKey.set(key, now)
		return true
	}

	private send(payload: RendererErrorStackPayload): void {
		if (!this.api) {
			return
		}

		const key = `${payload.kind}|${payload.message}|${payload.stack ?? ''}`
		if (!this.shouldSend(key)) {
			return
		}

		this.api.sendErrorStack(payload)
	}
}

/**
 * Installs the renderer error-stack forwarder once, with Vite HMR-safe lifecycle management.
 *
 * Call this as early as possible in the renderer entrypoint (before app init) so uncaught errors
 * during startup are captured.
 */
export function installRendererErrorStackForwarderForHmr(): void {
	const forwarder = new RendererErrorStackForwarder()

	if (!import.meta.hot) {
		forwarder.install()
		return
	}

	const previous = window.__rendererErrorStackForwarderForHmr
	previous?.dispose()

	import.meta.hot.dispose(() => {
		window.__rendererErrorStackForwarderForHmr?.dispose()
		window.__rendererErrorStackForwarderForHmr = null
	})

	forwarder.install()
	window.__rendererErrorStackForwarderForHmr = forwarder
}

function stringifyConsoleArgs(args: unknown[]): string {
	return args
		.map((arg) => {
			if (arg instanceof Error) {
				return `${arg.name}: ${arg.message}`
			}
			return typeof arg === 'string' ? arg : safeStringify(arg)
		})
		.join(' ')
}

function safeStringify(value: unknown): string {
	if (typeof value === 'string') {
		return value
	}
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}
