import { EventfulContainer } from '@components/canvas/phaser/robowhale/phaser3/gameObjects/container/EventfulContainer'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { shouldIgnoreObject } from '../editContext/EditContext'

export interface CloneOptions {
	addToScene?: boolean
}

export interface ObjectsFactoryOptions {
	scene: Phaser.Scene
	logger: Logger<{}>
}

export class ObjectsFactory {
	private scene: Phaser.Scene
	private logger: Logger<{}>

	constructor(options: ObjectsFactoryOptions) {
		this.scene = options.scene
		this.logger = options.logger
	}

	public toJson(obj: SerializableGameObject): JSONGameObject {
		return match(obj)
			.returnType<JSONGameObject>()
			.with({ type: 'Container' }, (container) => {
				const children = container.list
					.map((child) => {
						if (shouldIgnoreObject(child)) {
							return null
						}

						if (isSerializableGameObject(child)) {
							return this.toJson(child)
						}

						this.logger.error('container child is not serializable', { child })
						// TODO throw custom error
						throw new Error('container child is not serializable')
					})
					.filter((child) => child !== null)

				return {
					...container.toJSON(),
					width: container.width,
					height: container.height,
					depth: container.depth,
					blendMode: container.blendMode,
					name: container.name,
					children,
					scale: { x: container.scaleX, y: container.scaleY },
					type: 'Container',
				}
			})
			.with({ type: 'Image' }, (image) => ({
				...image.toJSON(),
				depth: image.depth,
				blendMode: image.blendMode,
				name: image.name,
				type: 'Image',
			}))
			.exhaustive()
	}

	/**
	 * Creates an object but it **doesn't add it to the scene**
	 */
	public fromJson(json: JSONGameObject): SerializableGameObject {
		return match(json)
			.returnType<SerializableGameObject>()
			.with({ type: 'Container' }, (containerJson) => {
				const children = containerJson.children.map((childJson) => this.fromJson(childJson))
				const container = new EventfulContainer(this.scene, containerJson.x, containerJson.y, children)

				container.setScale(containerJson.scale.x, containerJson.scale.y)
				container.setRotation(containerJson.rotation)
				container.setAlpha(containerJson.alpha)
				container.setVisible(containerJson.visible)
				container.setName(containerJson.name)
				container.setDepth(containerJson.depth)
				container.setBlendMode(containerJson.blendMode)
				container.setSize(containerJson.width, containerJson.height)

				return container as SerializableGameObjectOfType<'Container'>
			})
			.with({ type: 'Image' }, (imageJson) => {
				const image = this.scene.make.image(
					{
						key: imageJson.textureKey,
						frame: imageJson.frameKey,
						x: imageJson.x,
						y: imageJson.y,
						rotation: imageJson.rotation,
						scale: imageJson.scale,
						alpha: imageJson.alpha,
						visible: imageJson.visible,
						flipX: imageJson.flipX,
						flipY: imageJson.flipY,
						origin: imageJson.origin,
						scaleMode: imageJson.scaleMode,
					},
					false
				)

				image.setName(imageJson.name)
				image.setDepth(imageJson.depth)
				image.setBlendMode(imageJson.blendMode)

				return image as SerializableGameObjectOfType<'Image'>
			})
			.exhaustive()
	}

	public clone(obj: SerializableGameObject, options?: CloneOptions): SerializableGameObject {
		const json = this.toJson(obj)
		const cloned = this.fromJson(json)

		if (options?.addToScene) {
			this.scene.add.existing(cloned)
		}

		return cloned
	}
}

export type SerializableGameObject =
	| ({ type: 'Container' } & Phaser.GameObjects.Container)
	| ({ type: 'Image' } & Phaser.GameObjects.Image)

export type SerializableGameObjectType = SerializableGameObject['type']

export type SerializableGameObjectOfType<T extends SerializableGameObjectType> = Extract<
	SerializableGameObject,
	{ type: T }
>

export function isSerializableGameObject(obj: Phaser.GameObjects.GameObject): obj is SerializableGameObject {
	return obj.type === 'Container' || obj.type === 'Image'
}

export type JSONGameObject =
	| ({
			type: 'Container'
			width: number
			height: number
			children: JSONGameObject[]
			name: string
			depth: number
			blendMode: string | Phaser.BlendModes | number
			scale: { x: number; y: number }
	  } & Phaser.Types.GameObjects.JSONGameObject)
	| ({
			type: 'Image'
			name: string
			depth: number
			blendMode: string | Phaser.BlendModes | number
	  } & Phaser.Types.GameObjects.JSONGameObject)
