import { MissingCommandCallbackError } from './MissingCommandCallbackError'
import { TypedEvent, TypedEventMap } from './TypedEvent'

type AnyFunction = (...args: any[]) => any

type CommandHandler = {
	command: string
	callback: AnyFunction
	callbackCtx?: unknown
	once: boolean
}

/**
 * The `CommandEmitter` class is responsible for managing and emitting commands.
 * Commands are similar to events but are typically used for more specific,
 * often imperative actions, whereas events are usually used for broader
 * notifications of state changes.
 *
 * @template TCommands - A map of command names to their corresponding callback types.
 */
export class CommandEmitter<TCommands extends TypedEventMap> {
	private readonly name: string
	private handlers: CommandHandler[]
	private isDestroyed: boolean
	public throwOnMissingCallbacks = false

	constructor(name: string, throwOnMissingCallbacks = false) {
		this.name = name
		this.throwOnMissingCallbacks = throwOnMissingCallbacks
		this.handlers = []
		this.isDestroyed = false
	}

	/**
	 * @return - возвращает функцию, вызвав которую произойдет отписка от заданной команды.
	 */
	public on<C extends TypedEvent<TCommands>>(
		command: C,
		callback: TCommands[C],
		callbackCtx?: unknown,
		once = false,
		abortSignal?: AbortSignal,
	) {
		this.throwIfDestroyed()

		const existingHandlerIndex = this.handlers.findIndex((item) => item.command === command)
		if (existingHandlerIndex > -1) {
			console.warn(`There is an existing handler for '${command}'. New handler will override the old one!`)
			this.handlers.splice(existingHandlerIndex, 1)
		}

		const handler = {
			command,
			callback,
			callbackCtx,
			once,
		}

		this.handlers.push(handler)

		const removeHandlerCallback = () => {
			const index = this.handlers.indexOf(handler)
			if (index > -1) {
				this.handlers.splice(index, 1)
			}
		}

		if (abortSignal) {
			if (abortSignal.aborted) {
				removeHandlerCallback()
			} else {
				abortSignal.addEventListener('abort', removeHandlerCallback)
			}
		}

		return removeHandlerCallback
	}

	/**
	 * @return - возвращает функцию, вызвав которую произойдет отписка от заданной команды.
	 */
	public once<C extends TypedEvent<TCommands>>(command: C, callback: TCommands[C], callbackCtx?: unknown, abortSignal?: AbortSignal) {
		return this.on(command, callback, callbackCtx, true, abortSignal)
	}

	public off<C extends TypedEvent<TCommands>>(command?: C): void {
		this.throwIfDestroyed()

		if (!command) {
			this.handlers.length = 0
			return
		}

		for (let i = this.handlers.length - 1; i >= 0; i--) {
			if (this.handlers[i].command === command) {
				this.handlers.splice(i, 1)
			}
		}
	}

	public offByContext(context: unknown): void {
		this.throwIfDestroyed()

		for (let i = this.handlers.length - 1; i >= 0; i--) {
			if (this.handlers[i].callbackCtx === context) {
				this.handlers.splice(i, 1)
			}
		}
	}

	public emit<C extends TypedEvent<TCommands>>(command: C, ...params: Parameters<TCommands[C]>): ReturnType<TCommands[C]> | undefined {
		this.throwIfDestroyed()

		const index = this.handlers.findIndex((item) => item.command === command)
		if (index === -1) {
			if (this.throwOnMissingCallbacks) {
				throw new MissingCommandCallbackError(command)
			}

			return undefined
		}

		const listener = this.handlers[index]
		if (listener.once) {
			this.handlers.splice(index, 1)
		}

		return listener.callback.call(listener.callbackCtx, ...params)
	}

	public has(command: TypedEvent<TCommands>): boolean {
		return this.handlers.some((item) => item.command === command)
	}

	private throwIfDestroyed(): void {
		if (this.isDestroyed) {
			console.warn(`command emitter '${this.name}' was destroyed and should not be used anymore`)
			throw new Error('Command emitter was destroyed!')
		}
	}

	public destroy(): void {
		if (this.isDestroyed) {
			return
		}

		this.isDestroyed = true
		this.handlers.length = 0
	}
}
