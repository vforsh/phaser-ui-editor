import { AnyFunction } from '../../../../../../types/helpers'

type EventEmitter = {
	on: (event: string, listener: AnyFunction) => void
	once: (event: string, listener: AnyFunction) => void
}

/**
 * Create an AbortSignal from an event emitter.
 * @param emitter - The event emitter.
 * @param event - The event to listen to.
 * @returns An AbortSignal.
 */
export function signalFromEvent(emitter: EventEmitter, event: string) {
	const controller = new AbortController()
	emitter.once(event, () => controller.abort())
	return controller.signal
}
