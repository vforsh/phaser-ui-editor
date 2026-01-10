import { state } from '@state/State'
import { ILogObj, Logger } from 'tslog'

import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { EditableObject, EditableObjectJson } from './objects/EditableObject'
import { EditableObjectsFactory } from './objects/EditableObjectsFactory'
import { assignNewLocalIds } from './objects/localId'

type Events = {
	// "copy": (data: string) => void
	// "paste": (data: string) => void
}

export type ClipboardOptions = {
	logger: Logger<ILogObj>
	factory: EditableObjectsFactory
}

export class CanvasClipboard extends TypedEventEmitter<Events> {
	public readonly logger: ClipboardOptions['logger']
	private readonly factory: ClipboardOptions['factory']

	constructor(
		private readonly scene: BaseScene,
		private readonly options: ClipboardOptions,
	) {
		super()

		this.logger = options.logger
		this.factory = options.factory
	}

	public copy(objects: EditableObject[]): void {
		state.canvas.clipboard = JSON.stringify(objects.map((obj) => obj.toJson()))
	}

	public paste(): EditableObject[] | null {
		if (!state.canvas.clipboard) {
			return null
		}

		const itemsJsons = JSON.parse(state.canvas.clipboard) as EditableObjectJson[]
		itemsJsons.forEach((json) => assignNewLocalIds(json))
		const items = itemsJsons.map((json: EditableObjectJson) => this.factory.fromJson(json))

		return items
	}

	public clear(): void {
		state.canvas.clipboard = undefined
	}

	public isEmpty(): boolean {
		return !state.canvas.clipboard
	}
}
