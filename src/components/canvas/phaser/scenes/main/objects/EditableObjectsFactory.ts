import { TypedEventEmitter } from '@components/canvas/phaser/robowhale/phaser3/TypedEventEmitter'
import { IPatchesConfig } from '@koreez/phaser3-ninepatch'
import { customAlphabet } from 'nanoid'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import {
	PrefabBitmapFontAsset,
	PrefabImageAsset,
	PrefabSpritesheetFrameAsset,
	PrefabWebFontAsset,
} from '../../../../../../types/prefabs/PrefabAsset'
import { EditableBitmapText, EditableBitmapTextJson } from './EditableBitmapText'
import { EditableContainer, EditableContainerJson } from './EditableContainer'
import { EditableImage, EditableImageJson } from './EditableImage'
import { EditableNineSlice, EditableNineSliceJson } from './EditableNineSlice'
import { EditableObject, EditableObjectJson } from './EditableObject'
import { EditableText, EditableTextJson, EditableTextStyleJson } from './EditableText'
import { EditableComponentJson } from './components/base/EditableComponent'
import { EditableComponentsFactory } from './components/base/EditableComponentsFactory'

type Events = {
	// emitted after an object is created and has an id, but **not added to the scene**
	'obj-registered': (obj: EditableObject) => void
	// emitted after an object is destroyed
	'obj-destroyed': (obj: EditableObject) => void
}

export interface CloneOptions {
	addToScene?: boolean
}

export interface EditableObjectsFactoryOptions {
	scene: Phaser.Scene
	logger: Logger<{}>
	componentsFactory: EditableComponentsFactory
}

export class EditableObjectsFactory extends TypedEventEmitter<Events> {
	private scene: Phaser.Scene
	private logger: Logger<{}>
	private nanoid: (size?: number) => string
	private componentsFactory: EditableComponentsFactory
	private idsToObjects: Map<string, EditableObject> = new Map()
	private destroyController = new AbortController()

	constructor(options: EditableObjectsFactoryOptions) {
		super()

		this.scene = options.scene
		this.logger = options.logger
		this.nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz', 8)
		this.componentsFactory = options.componentsFactory
	}

	private register(obj: EditableObject): void {
		if (this.idsToObjects.has(obj.id)) {
			throw new Error(`object with id ${obj.id} already exists`)
		}

		obj.once(
			'destroy',
			() => {
				this.idsToObjects.delete(obj.id)
				this.emit('obj-destroyed', obj)
			},
			this,
			this.destroySignal
		)

		this.idsToObjects.set(obj.id, obj)

		this.emit('obj-registered', obj)
	}

	private getObjectId(): string {
		let id = this.nanoid()
		while (this.idsToObjects.has(id)) {
			id = this.nanoid()
		}
		return id
	}

	public container(): EditableContainer {
		const id = this.getObjectId()
		const container = new EditableContainer(this.scene, id, null, 0, 0, [])
		this.register(container)
		return container
	}

	public image(
		asset: PrefabImageAsset | PrefabSpritesheetFrameAsset,
		texture: string,
		frame?: string | number
	): EditableImage {
		const id = this.getObjectId()
		const image = new EditableImage(this.scene, id, asset, 0, 0, texture, frame)
		this.register(image)
		return image
	}

	public nineSlice(
		asset: PrefabImageAsset | PrefabSpritesheetFrameAsset,
		width: number,
		height: number,
		texture: string,
		frame?: string | number,
		patchesConfig?: IPatchesConfig
	): EditableNineSlice {
		const id = this.getObjectId()
		const nineSlice = new EditableNineSlice(this.scene, id, asset, width, height, texture, frame, patchesConfig)
		this.register(nineSlice)
		return nineSlice
	}

	public text(asset: PrefabWebFontAsset, content: string, style: EditableTextStyleJson): EditableText {
		const id = this.getObjectId()
		const text = new EditableText(this.scene, id, asset, 0, 0, content, style)
		text.setOrigin(0.5)
		this.register(text)
		return text
	}

	public bitmapText(
		asset: PrefabBitmapFontAsset,
		font: string,
		content: string,
		fontSize?: number
	): EditableBitmapText {
		const id = this.getObjectId()
		const bitmapText = new EditableBitmapText(this.scene, id, asset, font, content, fontSize)
		bitmapText.setOrigin(0.5)
		this.register(bitmapText)
		return bitmapText
	}

	/**
	 * Creates an object but it **doesn't add it to the scene**
	 */
	public fromJson(json: EditableObjectJson) {
		const obj = match(json)
			.with({ type: 'Container' }, (json) => this.createContainerFromJson(json))
			.with({ type: 'Image' }, (json) => this.createImageFromJson(json))
			.with({ type: 'NineSlice' }, (json) => this.createNineSliceFromJson(json))
			.with({ type: 'Text' }, (json) => this.createTextFromJson(json))
			.with({ type: 'BitmapText' }, (json) => this.createBitmapTextFromJson(json))
			.exhaustive()

		this.register(obj)

		return obj
	}

	private createContainerFromJson(json: EditableContainerJson): EditableContainer {
		const id = this.getObjectId()
		const children = json.children.map((childJson) => this.fromJson(childJson))
		const container = new EditableContainer(this.scene, id, json.prefab, json.x, json.y, children)

		container.setScale(json.scale.x, json.scale.y)
		container.setRotation(json.rotation)
		container.setAlpha(json.alpha)
		container.setVisible(json.visible)
		container.setName(json.name)
		container.setDepth(json.depth)
		container.setBlendMode(json.blendMode)
		container.setSize(json.width, json.height)
		container.locked = json.locked
		this.initComponents(container, json.components)

		return container
	}

	private createImageFromJson(json: EditableImageJson): EditableImage {
		const id = this.getObjectId()
		const image = new EditableImage(this.scene, id, json.asset, json.x, json.y, json.textureKey, json.frameKey)

		image.setName(json.name)
		image.setVisible(json.visible)
		image.setLocked(json.locked)
		image.setAlpha(json.alpha)
		image.setRotation(json.rotation)
		image.setDepth(json.depth)
		image.setBlendMode(json.blendMode)
		image.setScale(json.scale.x, json.scale.y)
		image.setOrigin(json.originX, json.originY)
		this.initComponents(image, json.components)

		return image
	}

	private createNineSliceFromJson(json: EditableNineSliceJson): EditableNineSlice {
		const id = this.getObjectId()
		const nineSlice = new EditableNineSlice(
			this.scene,
			id,
			json.asset,
			json.width,
			json.height,
			json.textureKey,
			json.frameKey,
			json.ninePatchConfig
		)

		nineSlice.setPosition(json.x, json.y)
		nineSlice.setName(json.name)
		nineSlice.setVisible(json.visible)
		nineSlice.setAlpha(json.alpha)
		nineSlice.setRotation(json.rotation)
		nineSlice.setDepth(json.depth)
		nineSlice.setBlendMode(json.blendMode)
		nineSlice.setScale(json.scale.x, json.scale.y)
		nineSlice.locked = json.locked
		this.initComponents(nineSlice, json.components)

		return nineSlice
	}

	private createTextFromJson(json: EditableTextJson): EditableText {
		const id = this.getObjectId()
		const text = new EditableText(this.scene, id, json.asset, json.x, json.y, json.text, json.style)

		text.setName(json.name)
		text.setVisible(json.visible)
		text.setAlpha(json.alpha)
		text.setRotation(json.rotation)
		text.setDepth(json.depth)
		text.setBlendMode(json.blendMode)
		text.setScale(json.scale.x, json.scale.y)
		text.setOrigin(json.originX, json.originY)
		text.locked = json.locked
		this.initComponents(text, json.components)

		return text
	}

	private createBitmapTextFromJson(json: EditableBitmapTextJson): EditableBitmapText {
		const id = this.getObjectId()
		const bitmapText = new EditableBitmapText(
			this.scene,
			id,
			json.asset,
			json.font,
			json.text,
			json.fontSize,
			json.align
		)

		bitmapText.setPosition(json.x, json.y)
		bitmapText.setName(json.name)
		bitmapText.setVisible(json.visible)
		bitmapText.setAlpha(json.alpha)
		bitmapText.setRotation(json.rotation)
		bitmapText.setDepth(json.depth)
		bitmapText.setBlendMode(json.blendMode)
		bitmapText.setScale(json.scale.x, json.scale.y)
		bitmapText.setOrigin(json.originX, json.originY)
		bitmapText.setMaxWidth(json.maxWidth)
		bitmapText.locked = json.locked
		this.initComponents(bitmapText, json.components)

		return bitmapText
	}

	private initComponents(obj: EditableObject, components: EditableComponentJson[]): void {
		for (const componentJson of components) {
			const component = this.componentsFactory.fromJson(componentJson)
			obj.components.add(component)
		}
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
		super.destroy()

		this.idsToObjects.clear()
		this.destroyController.abort()
	}

	get destroySignal(): AbortSignal {
		return this.destroyController.signal
	}
}
