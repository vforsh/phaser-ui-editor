import { isValtioProxy } from '@state/valtio-utils'
import { subscribe } from 'valtio'

type StateObject = { [key: string]: unknown }

type ChangeCallback<T extends StateObject, K extends Exclude<keyof T, 'id' | 'type'>> = (
	value: T[K],
	prevValue: T[K]
) => void

type ChangeCallbackMap<T extends StateObject> = {
	[K in Exclude<keyof T, 'id' | 'type'>]?: ChangeCallback<T, K>
}

export class ObjectChangesEmitter<T extends StateObject> {
	private unsub: () => void
	private _emitsEnabled = true

	constructor(objState: T, callbacks: ChangeCallbackMap<T>, signal?: AbortSignal) {
		if (!isValtioProxy(objState)) {
			throw new Error('EditableObjectChangesEmitter: obj is not a valtio proxy')
		}

		this.unsub = subscribe(
			objState,
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
			true
		)

		if (signal) {
			signal.addEventListener(
				'abort',
				() => {
					this.destroy()
				},
				{ once: true }
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
