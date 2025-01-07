import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { EditableBitmapText, EditableBitmapTextJson } from './EditableBitmapText'
import { EditableContainer, EditableContainerJson } from './EditableContainer'
import { EditableImage, EditableImageJson } from './EditableImage'
import { EditableObject, EditableObjectJson } from './EditableObject'
import { EditableText, EditableTextJson } from './EditableText'

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
	private idsToObjects: Map<string, EditableObject> = new Map()
	private destroyController = new AbortController()

	constructor(options: ObjectsFactoryOptions) {
		this.scene = options.scene
		this.logger = options.logger
	}

	private register(obj: EditableObject): void {
		if (this.idsToObjects.has(obj.id)) {
			throw new Error(`object with id ${obj.id} already exists`)
		}

		obj.once(
			'destroy',
			() => {
				this.idsToObjects.delete(obj.id)
			},
			this,
			this.destroySignal
		)

		this.idsToObjects.set(obj.id, obj)
	}

	private getObjectId(): string {
		// TODO replace with nanoid
		let id = Phaser.Math.RND.uuid().split('-')[0]
		while (this.idsToObjects.has(id)) {
			id = Phaser.Math.RND.uuid().split('-')[0]
		}
		return id
	}

	// TODO remove
	public toJson(obj: EditableObject): EditableObjectJson {
		return obj.toJson()
	}

	public container(): EditableContainer {
		const id = this.getObjectId()
		const container = new EditableContainer(this.scene, id, 0, 0, [])
		this.register(container)
		return container
	}

	public image(texture: string, frame?: string | number): EditableImage {
		const id = this.getObjectId()
		const image = new EditableImage(this.scene, id, 0, 0, texture, frame)
		this.register(image)
		return image
	}

	public text(content: string, style: Phaser.Types.GameObjects.Text.TextStyle): EditableText {
		const id = this.getObjectId()
		const text = new EditableText(this.scene, id, 0, 0, content, style)
		text.setOrigin(0.5)
		this.register(text)
		return text
	}

	/**
	 * Creates an object but it **doesn't add it to the scene**
	 */
	public fromJson(json: EditableObjectJson) {
		const obj = match(json)
			.with({ type: 'Container' }, (json) => this.createContainerFromJson(json))
			.with({ type: 'Image' }, (json) => this.createImageFromJson(json))
			.with({ type: 'Text' }, (json) => this.createTextFromJson(json))
			.with({ type: 'BitmapText' }, (json) => this.createBitmapTextFromJson(json))
			.exhaustive()

		this.register(obj)

		return obj
	}

	private createContainerFromJson(json: EditableContainerJson): EditableContainer {
		const id = this.getObjectId()
		const children = json.children.map((childJson) => this.fromJson(childJson))
		const container = new EditableContainer(this.scene, id, json.x, json.y, children)

		container.setScale(json.scale.x, json.scale.y)
		container.setRotation(json.rotation)
		container.setAlpha(json.alpha)
		container.setVisible(json.visible)
		container.setName(json.name)
		container.setDepth(json.depth)
		container.setBlendMode(json.blendMode)
		container.setSize(json.width, json.height)
		container.locked = json.locked

		return container
	}

	private createImageFromJson(json: EditableImageJson): EditableImage {
		const id = this.getObjectId()
		const image = new EditableImage(this.scene, id, json.x, json.y, json.textureKey, json.frameKey)
		image.setName(json.name)
		image.setVisible(json.visible)
		image.setAlpha(json.alpha)
		image.setRotation(json.rotation)
		image.setDepth(json.depth)
		image.setBlendMode(json.blendMode)
		image.setScale(json.scale.x, json.scale.y)
		image.setOrigin(json.origin.x, json.origin.y)
		image.locked = json.locked

		return image
	}

	private createTextFromJson(json: EditableTextJson): EditableText {
		const id = this.getObjectId()
		const text = new EditableText(this.scene, id, json.x, json.y, json.text, json.style)
		text.setName(json.name)
		text.setVisible(json.visible)
		text.setAlpha(json.alpha)
		text.setRotation(json.rotation)
		text.setDepth(json.depth)
		text.setBlendMode(json.blendMode)
		text.setScale(json.scale.x, json.scale.y)
		text.setOrigin(json.origin.x, json.origin.y)
		text.locked = json.locked

		return text
	}

	private createBitmapTextFromJson(json: EditableBitmapTextJson): EditableBitmapText {
		const id = this.getObjectId()
		const bitmapText = new EditableBitmapText(this.scene, id, json.font, json.text, json.fontSize, json.align)
		bitmapText.setPosition(json.x, json.y)
		bitmapText.setName(json.name)
		bitmapText.setVisible(json.visible)
		bitmapText.setAlpha(json.alpha)
		bitmapText.setRotation(json.rotation)
		bitmapText.setDepth(json.depth)
		bitmapText.setBlendMode(json.blendMode)
		bitmapText.setScale(json.scale.x, json.scale.y)
		bitmapText.setOrigin(json.origin.x, json.origin.y)
		bitmapText.setMaxWidth(json.maxWidth)
		bitmapText.locked = json.locked

		return bitmapText
	}

	public clone(obj: EditableObject, options?: CloneOptions): EditableObject {
		const json = obj.toJson()

		const cloned = this.fromJson(json)

		if (options?.addToScene) {
			this.scene.add.existing(cloned)
		}

		return cloned
	}

	public getObjectById(id: string): EditableObject | undefined {
		return this.idsToObjects.get(id)
	}

	public destroy(): void {
		this.idsToObjects.clear()
		this.destroyController.abort()
	}

	get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
