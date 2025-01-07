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

	constructor(options: ObjectsFactoryOptions) {
		this.scene = options.scene
		this.logger = options.logger
	}

	public toJson(obj: EditableObject): EditableObjectJson {
		return obj.toJson()
	}

	/**
	 * Creates an object but it **doesn't add it to the scene**
	 */
	public fromJson(json: EditableObjectJson) {
		return match(json)
			.with({ type: 'Container' }, (json) => this.createContainer(json))
			.with({ type: 'Image' }, (json) => this.createImage(json))
			.with({ type: 'Text' }, (json) => this.createText(json))
			.with({ type: 'BitmapText' }, (json) => this.createBitmapText(json))
			.exhaustive()
	}

	private createContainer(json: EditableContainerJson): EditableContainer {
		const children = json.children.map((childJson) => this.fromJson(childJson))
		const container = new EditableContainer(this.scene, json.x, json.y, children)

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

	private createImage(json: EditableImageJson): EditableImage {
		const image = new EditableImage(this.scene, json.x, json.y, json.textureKey, json.frameKey)
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

	private createText(json: EditableTextJson): EditableText {
		const text = new EditableText(this.scene, json.x, json.y, json.text, json.style)
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

	private createBitmapText(json: EditableBitmapTextJson): EditableBitmapText {
		const text = new EditableBitmapText(this.scene, json.x, json.y, json.font, json.text, json.fontSize, json.align)
		text.setName(json.name)
		text.setVisible(json.visible)
		text.setAlpha(json.alpha)
		text.setRotation(json.rotation)
		text.setDepth(json.depth)
		text.setBlendMode(json.blendMode)
		text.setScale(json.scale.x, json.scale.y)
		text.setOrigin(json.origin.x, json.origin.y)
		text.setMaxWidth(json.maxWidth)
		text.locked = json.locked
		return text
	}

	public clone(obj: EditableObject, options?: CloneOptions): EditableObject {
		const json = obj.toJson()

		const cloned = this.fromJson(json)

		if (options?.addToScene) {
			this.scene.add.existing(cloned)
		}

		return cloned
	}
}
