import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { BaseScene } from '../../robowhale/phaser3/scenes/BaseScene'
import { TypedEventEmitter } from '../../robowhale/phaser3/TypedEventEmitter'
import { Transformable } from './selection/Transformable'

type Events = {
	// "copy": (data: string) => void
	// "paste": (data: string) => void
}

export type ClipboardOptions = {
	logger: Logger<{}>
}

// TODO pass logger
export class CanvasClipboard extends TypedEventEmitter<Events> {
	private content: Phaser.Types.GameObjects.JSONGameObject[] | undefined
	private logger: ClipboardOptions['logger']

	constructor(
		private readonly scene: BaseScene,
		private readonly options: ClipboardOptions
	) {
		super()

		this.logger = options.logger
	}

	public copy(content: Transformable[]): void {
		this.content = content.map((item) => item.toJSON())
	}

	public paste(): Transformable[] | null {
		if (this.content === undefined) {
			return null
		}
		
		const items = this.content.map((json) => {
			const transformable = this.fromJson(json)
			if (transformable === null) {
				console.error('failed to paste item', { json })
				throw new Error('failed to paste item')
			}
			
			return transformable
		})

		return items
	}

	// TODO return Result
	private fromJson(json: Phaser.Types.GameObjects.JSONGameObject): Transformable | null {
		return match(json)
			.with({ type: 'Image' }, () => {
				const image = this.scene.make.image(
					{
						key: json.textureKey,
						frame: json.frameKey,
						x: json.x,
						y: json.y,
						rotation: json.rotation,
						scale: json.scale,
						alpha: json.alpha,
						visible: json.visible,
						flipX: json.flipX,
						flipY: json.flipY,
						origin: json.origin,
					},
					false
				)
				image.setName(json.name + '_copy')
				return image
			})
			// TODO implement container copy
			.otherwise(() => null)
	}

	public isEmpty(): boolean {
		return this.content === undefined
	}
}
