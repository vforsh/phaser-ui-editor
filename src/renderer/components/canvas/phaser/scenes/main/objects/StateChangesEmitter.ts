import { isValtioProxy } from '@state/valtio-utils'
import { Path, PathValue } from 'dot-path-value'
import { subscribe } from 'valtio'

type StateObject = { [key: string]: unknown }

type StatePaths<T extends StateObject> = Exclude<Path<T>, 'id' | 'type'>

type ChangeCallback<T extends StateObject, K extends StatePaths<T>> = (value: PathValue<T, K>, prevValue: PathValue<T, K>) => void

type ChangeCallbackMap<T extends StateObject> = {
	[K in StatePaths<T>]?: ChangeCallback<T, K>
}

/**
 * Pass a valtio state object and a map of callbacks to subscribe to state changes.
 * The callbacks will be called with the new and previous values of the state object when the state changes.
 */
export class StateChangesEmitter<T extends StateObject> {
	private unsub: () => void
	private _emitsEnabled = true

	constructor(state: T, callbacks: ChangeCallbackMap<T>, signal?: AbortSignal) {
		if (!isValtioProxy(state)) {
			throw new Error('state should be a valtio proxy')
		}

		this.unsub = subscribe(
			state,
			(ops) => {
				if (!this._emitsEnabled) {
					return
				}

				ops.forEach(([type, path, value, prevValue]) => {
					const key = path.join('.')
					const callback = callbacks[key as keyof typeof callbacks]
					if (callback) {
						// @ts-expect-error
						callback(value, prevValue)
					}
				})
			},
			true,
		)

		if (signal) {
			signal.addEventListener(
				'abort',
				() => {
					this.destroy()
				},
				{ once: true },
			)
		}
	}

	public get emitsEnabled() {
		return this._emitsEnabled
	}

	public set emitsEnabled(value: boolean) {
		this._emitsEnabled = value
	}

	destroy() {
		this.unsub()
	}
}
