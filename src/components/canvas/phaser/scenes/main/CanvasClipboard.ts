import { Logger } from 'tslog'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { EditableObject, EditableObjectJson } from './objects/IEditableObject'
import { EditableObjectsFactory } from './objects/EditableObjectsFactory'

type Events = {
	// "copy": (data: string) => void
	// "paste": (data: string) => void
}

export type ClipboardOptions = {
	logger: Logger<{}>
	factory: EditableObjectsFactory
}

export class CanvasClipboard extends TypedEventEmitter<Events> {
	public readonly logger: ClipboardOptions['logger']
	private readonly factory: ClipboardOptions['factory']
	private content: EditableObjectJson[] | undefined

	constructor(
		private readonly scene: BaseScene,
		private readonly options: ClipboardOptions
	) {
		super()

		this.logger = options.logger
		this.factory = options.factory
	}

	public copy(content: EditableObject[]): void {
		this.content = content.map((item) => item.toJson())
	}

	public paste(): EditableObject[] | null {
		if (this.content === undefined) {
			return null
		}

		const items = this.content.map((json) => this.factory.fromJson(json))

		return items
	}

	public clear(): void {
		this.content = undefined
	}

	public isEmpty(): boolean {
		return this.content === undefined
	}
}
