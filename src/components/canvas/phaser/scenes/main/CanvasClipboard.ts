import { Logger } from 'tslog'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { JSONGameObject, ObjectsFactory, SerializableGameObject } from './factory/ObjectsFactory'

type Events = {
	// "copy": (data: string) => void
	// "paste": (data: string) => void
}

export type ClipboardOptions = {
	logger: Logger<{}>
	factory: ObjectsFactory
}

export class CanvasClipboard extends TypedEventEmitter<Events> {
	public readonly logger: ClipboardOptions['logger']
	private readonly factory: ClipboardOptions['factory']
	private content: JSONGameObject[] | undefined

	constructor(
		private readonly scene: BaseScene,
		private readonly options: ClipboardOptions
	) {
		super()

		this.logger = options.logger
		this.factory = options.factory
	}

	public copy(content: SerializableGameObject[]): void {
		this.content = content.map((item) => this.factory.toJson(item))
	}

	public paste(): SerializableGameObject[] | null {
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
