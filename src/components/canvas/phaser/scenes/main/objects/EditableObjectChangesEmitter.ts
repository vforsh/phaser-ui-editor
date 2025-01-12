import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { subscribe } from 'valtio'
import { EditableObjectJson } from './EditableObject'

type ChangeEvents<T extends EditableObjectJson> = {
	[K in Exclude<keyof T, 'id' | 'type'>]: (value: T[K], prevValue: T[K]) => void
}

export class EditableObjectChangesEmitter<T extends EditableObjectJson> extends TypedEventEmitter<ChangeEvents<T>> {
	private unsub: () => void

	constructor(obj: T) {
		super()

		// TODO make sure that obj is valtio proxy

		this.unsub = subscribe(obj, (ops) => {
			ops.forEach(([type, path, value, prevValue]) => {
				// @ts-expect-error
				this.emit(path[0] as keyof T, value, prevValue)
			})
		})
	}

	destroy() {
		this.unsub()

		super.destroy()
	}
}
