import Phaser from 'phaser'

import { EmptyEvents, TypedEvent, TypedEventMap } from '../utils/events/TypedEvent'

/**
 * A type-safe EventEmitter that provides stricter type checking for event names and their corresponding listenes.
 * This ensures that only valid events and listeners can be registered, emitted, and removed, reducing the likelihood of runtime errors.
 *
 * @template TEvents - A map of event names to their corresponding listener function types. Defaults to an empty event map.
 */
export class TypedEventEmitter<TEvents extends TypedEventMap = EmptyEvents> extends Phaser.Events.EventEmitter {
	// @ts-expect-error
	__eventsMap: TEvents

	constructor() {
		super()
	}

	override on<TEvent extends TypedEvent<TEvents>>(
		event: TEvent,
		listener: TEvents[TEvent],
		context?: unknown,
		signal?: AbortSignal,
	): this {
		if (signal) {
			if (signal.aborted) {
				return this
			}

			signal.addEventListener('abort', () => this.off(event, listener), { once: true })
		}

		return super.on(event, listener, context)
	}

	override once<TEvent extends TypedEvent<TEvents>>(
		event: TEvent,
		listener: TEvents[TEvent],
		context?: unknown,
		signal?: AbortSignal,
	): this {
		if (signal) {
			if (signal.aborted) {
				return this
			}

			signal.addEventListener('abort', () => this.off(event, listener), { once: true })
		}

		return super.once(event, listener, context)
	}

	override off<TEvent extends TypedEvent<TEvents>>(event: TEvent, listener: TEvents[TEvent], context?: unknown, once?: boolean): this {
		return super.off(event, listener, context, once)
	}

	override emit<TEvent extends TypedEvent<TEvents>>(event: TEvent, ...args: Parameters<TEvents[TEvent]>): boolean {
		return super.emit(event, ...args)
	}

	public has<TEvent extends TypedEvent<TEvents>>(event: TEvent): boolean {
		return super.eventNames().includes(event)
	}
}

export type TypedEventEmitterEvents<T extends TypedEventEmitter<any>> = T extends TypedEventEmitter<infer E> ? keyof E : never
